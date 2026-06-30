"""
Tests for app.services.ai.agents — ClaimsAIOrchestrator (refactored)

Covers:
  - _parse_json_response: valid JSON, embedded JSON, malformed input
  - Multi-agent analyze_claim: RAG → Damage → Policy → Decision pipeline
    with ``get_structured_llm`` mocked at the module level
  - SourceCitation: schema validation and discipline rules
  - _build_citation_index: citation helper formatting
  - Fallback behavior when individual agents fail
  - Chat method integration with DialogEngine
  - Session management across multiple messages
"""
import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from types import SimpleNamespace

from app.services.ai.agents import (
    ClaimsAIOrchestrator,
    SourceCitation,
    DamageAssessmentSchema,
    PolicyCoverageSchema,
    ClaimDecisionSchema,
    _SESSION_STORE,
    _build_citation_index,
)
from tests.unit.conftest import make_anthropic_response, make_structured_llm_mock


# ===========================================================================
# _parse_json_response
# ===========================================================================

class TestParseJsonResponse:
    """Verify JSON extraction from various LLM response formats."""

    @pytest.fixture
    def orchestrator(self):
        return ClaimsAIOrchestrator()

    def test_should_parse_clean_json(self, orchestrator):
        text = '{"decision": "approve", "confidence": 0.95}'
        result = orchestrator._parse_json_response(text)
        assert result["decision"] == "approve"
        assert result["confidence"] == 0.95

    def test_should_extract_json_from_surrounding_text(self, orchestrator):
        text = 'Here is my analysis:\n{"decision": "reject", "confidence": 0.3}\nEnd.'
        result = orchestrator._parse_json_response(text)
        assert result["decision"] == "reject"

    def test_should_return_empty_dict_when_no_json(self, orchestrator):
        result = orchestrator._parse_json_response("This response has no JSON at all.")
        assert result == {}

    def test_should_return_empty_dict_when_malformed_json(self, orchestrator):
        result = orchestrator._parse_json_response('{"decision": "approve", "confidence": }')
        assert result == {}

    def test_should_handle_json_with_chinese_text(self, orchestrator):
        text = '{"reasoning": "该理赔符合保单条款", "decision": "approve"}'
        result = orchestrator._parse_json_response(text)
        assert result["reasoning"] == "该理赔符合保单条款"

    def test_should_handle_empty_string(self, orchestrator):
        assert orchestrator._parse_json_response("") == {}

    def test_should_handle_nested_json(self, orchestrator):
        text = json.dumps({"decision": "approve", "metadata": {"agent": "damage", "version": 1}})
        result = orchestrator._parse_json_response(text)
        assert result["metadata"]["agent"] == "damage"


# ===========================================================================
# Multi-agent analyze_claim (mocked get_structured_llm)
# ===========================================================================

class TestAnalyzeClaim:
    """
    Verify the full multi-agent orchestration pipeline.

    Each agent call to ``get_structured_llm`` is intercepted by patching
    the factory at the agents module level.  The mock returns the three
    Pydantic schema instances in sequence: Damage → Policy → Decision.
    """

    @pytest.fixture
    def orchestrator(self):
        return ClaimsAIOrchestrator()

    def _make_damage(self, amount=33000.0, severity="medium", notes="合理"):
        return DamageAssessmentSchema(
            estimated_amount=amount,
            damage_severity=severity,
            notes=notes,
        )

    def _make_policy(self, covered=True, reason="属于保障范围", clauses=None):
        return PolicyCoverageSchema(
            is_covered=covered,
            coverage_reason=reason,
            applicable_clauses=clauses or ["主险条款1.2"],
            citations=[],
        )

    def _make_decision(self, decision="approve", confidence=0.92, reasoning="OK", amount=33000.0):
        return ClaimDecisionSchema(
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            recommended_amount=amount,
            citations=[],
        )

    async def test_should_return_approve_decision_when_all_agents_agree(
        self, orchestrator, medical_claim, mock_db
    ):
        damage = self._make_damage()
        policy = self._make_policy()
        decision = self._make_decision()

        call_count = 0

        async def fake_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return damage
            if call_count == 2:
                return policy
            return decision

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        with patch("app.services.ai.agents.get_structured_llm", return_value=(mock_llm, "gemini")), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("mock rag context", [])):
            result = await orchestrator.analyze_claim(medical_claim, mock_db)

        assert result["decision"] == "approve"
        assert result["confidence"] == 0.92
        assert result["recommended_amount"] == 33000.0
        assert "damage_assessment" in result["metadata"]
        assert "policy_coverage" in result["metadata"]
        assert "rag_sources" in result["metadata"]

    async def test_should_return_reject_when_policy_not_covered(
        self, orchestrator, medical_claim, mock_db
    ):
        damage = self._make_damage(amount=35000.0, severity="high", notes="严重")
        policy = self._make_policy(covered=False, reason="属于既往症除外", clauses=["除外条款3.1"])
        decision = self._make_decision(decision="reject", confidence=0.88, reasoning="不在保障范围", amount=0.0)

        call_count = 0

        async def fake_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return damage
            if call_count == 2:
                return policy
            return decision

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        with patch("app.services.ai.agents.get_structured_llm", return_value=(mock_llm, "gemini")), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("context", [])):
            result = await orchestrator.analyze_claim(medical_claim, mock_db)

        assert result["decision"] == "reject"
        assert result["recommended_amount"] == 0.0

    async def test_should_call_get_structured_llm_three_times_for_three_agents(
        self, orchestrator, medical_claim, mock_db
    ):
        damage = self._make_damage(amount=30000.0)
        policy = self._make_policy()
        decision = self._make_decision(amount=30000.0)

        call_count = 0

        async def fake_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return damage
            if call_count == 2:
                return policy
            return decision

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        gsl_call_count = 0

        def counting_gsl(schema, *args, **kwargs):
            nonlocal gsl_call_count
            gsl_call_count += 1
            return (mock_llm, "gemini")

        with patch("app.services.ai.agents.get_structured_llm", side_effect=counting_gsl), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("context", [])):
            await orchestrator.analyze_claim(medical_claim, mock_db)

        assert gsl_call_count == 3

    async def test_should_pass_claim_details_to_damage_agent(
        self, orchestrator, auto_claim, mock_db
    ):
        """Verify the damage agent prompt contains claim type and amount."""
        damage = self._make_damage(amount=10000.0)
        policy = self._make_policy()
        decision = self._make_decision(amount=10000.0)

        call_count = 0
        captured_damage_messages = []

        async def fake_ainvoke(messages, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                captured_damage_messages.extend(messages)
                return damage
            if call_count == 2:
                return policy
            return decision

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        with patch("app.services.ai.agents.get_structured_llm", return_value=(mock_llm, "gemini")), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("rag", [])):
            await orchestrator.analyze_claim(auto_claim, mock_db)

        # The HumanMessage content for the damage agent must reference claim details
        human_content = captured_damage_messages[-1].content
        assert "车险" in human_content
        assert "12500" in human_content


# ===========================================================================
# Fallback behavior
# ===========================================================================

class TestFallbackBehavior:
    """Verify graceful degradation when individual agents fail."""

    @pytest.fixture
    def orchestrator(self):
        return ClaimsAIOrchestrator()

    async def test_should_fallback_damage_when_agent_raises(
        self, orchestrator, medical_claim, mock_db
    ):
        call_count = 0

        async def fake_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("Damage agent timeout")
            if call_count == 2:
                return PolicyCoverageSchema(
                    is_covered=True, coverage_reason="OK", applicable_clauses=[]
                )
            return ClaimDecisionSchema(
                decision="human_review", confidence=0.5, reasoning="Uncertain", recommended_amount=0.0
            )

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        with patch("app.services.ai.agents.get_structured_llm", return_value=(mock_llm, "gemini")), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("rag", [])):
            result = await orchestrator.analyze_claim(medical_claim, mock_db)

        assert "decision" in result
        assert "metadata" in result

    async def test_should_fallback_to_human_review_when_decision_agent_raises(
        self, orchestrator, medical_claim, mock_db
    ):
        call_count = 0

        async def fake_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return DamageAssessmentSchema(
                    estimated_amount=30000.0, damage_severity="medium", notes="OK"
                )
            if call_count == 2:
                return PolicyCoverageSchema(
                    is_covered=True, coverage_reason="OK", applicable_clauses=[]
                )
            raise RuntimeError("Decision agent error")

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=fake_ainvoke)

        with patch("app.services.ai.agents.get_structured_llm", return_value=(mock_llm, "gemini")), \
             patch.object(orchestrator, "_run_rag_agent", new_callable=AsyncMock,
                          return_value=("rag", [])):
            result = await orchestrator.analyze_claim(medical_claim, mock_db)

        assert result["decision"] == "human_review"
        assert result["confidence"] == 0.5


# ===========================================================================
# Chat method
# ===========================================================================

class TestChatMethod:
    """Verify the chat() method integrates with DialogEngine correctly."""

    @pytest.fixture
    def orchestrator(self):
        return ClaimsAIOrchestrator()

    async def test_should_return_reply_string_for_consultation(self, orchestrator):
        with patch("app.services.ai.dialog.get_structured_llm") as mock_gsl, \
             patch("app.services.ai.rag.lancedb.connect") as mock_ldb:
            # RAG returns empty (no real DB)
            mock_db = MagicMock()
            mock_db.table_names.return_value = []
            mock_ldb.return_value = mock_db

            reply = await orchestrator.chat(
                message="什么是免赔额？",
                user_id="user-001",
                session_id="test-session-consult",
            )
        assert isinstance(reply, str)
        assert len(reply) > 0

    async def test_should_return_reply_string_for_claim_filing(self, orchestrator):
        from app.services.ai.dialog import DialogResponseSchema

        mock_response = DialogResponseSchema(
            updated_data={"claim_type": "医疗险"},
            reply="好的，请问出险日期是什么时候？",
            is_complete=False,
        )
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            reply = await orchestrator.chat(
                message="我要理赔",
                user_id="user-001",
                session_id="test-session-claim",
            )
        assert isinstance(reply, str)
        assert len(reply) > 0

    async def test_should_maintain_session_across_messages(self, orchestrator):
        from app.services.ai.dialog import DialogResponseSchema

        session_id = "test-session-multi"

        async def mock_llm_response(messages, *a, **kw):
            return DialogResponseSchema(
                updated_data={"claim_type": "医疗险"},
                reply="请问出险日期？",
                is_complete=False,
            )

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=mock_llm_response)

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            await orchestrator.chat("我要理赔", user_id="user-001", session_id=session_id)
            await orchestrator.chat("2024年6月1日", user_id="user-001", session_id=session_id)

        assert session_id in _SESSION_STORE
        session = _SESSION_STORE[session_id]
        assert len(session["history"]) == 4  # 2 turns × (user + assistant)
        assert session["session_state"]["step"] >= 2

    async def test_should_create_default_session_when_no_id_provided(self, orchestrator):
        with patch("app.services.ai.rag.lancedb.connect") as mock_ldb:
            mock_db = MagicMock()
            mock_db.table_names.return_value = []
            mock_ldb.return_value = mock_db

            reply = await orchestrator.chat(message="你好", user_id="user-001")

        assert "default_session" in _SESSION_STORE
        assert isinstance(reply, str)


# ===========================================================================
# SourceCitation schema validation
# ===========================================================================

class TestSourceCitation:
    """Verify SourceCitation schema construction and field constraints."""

    def test_should_create_valid_citation_with_all_fields(self):
        citation = SourceCitation(
            document_name="汽车保险综合条款",
            clause_number="第十六条",
            exact_quote="被保险车辆发生碰撞事故，经核定属于保险责任范围内的，予以赔付。",
        )
        assert citation.document_name == "汽车保险综合条款"
        assert citation.clause_number == "第十六条"
        assert "碰撞" in citation.exact_quote

    def test_should_default_clause_number_to_empty_string(self):
        citation = SourceCitation(
            document_name="Health Insurance Master Policy",
            exact_quote="The deductible shall be applied before any payout.",
        )
        assert citation.clause_number == ""

    def test_should_fail_when_document_name_missing(self):
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            SourceCitation(exact_quote="some text")

    def test_should_fail_when_exact_quote_missing(self):
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            SourceCitation(document_name="条款A")

    def test_should_serialize_to_dict(self):
        citation = SourceCitation(
            document_name="健康险主险条款",
            clause_number="4.2",
            exact_quote="安心免赔额为人民币一千元整。",
        )
        data = citation.model_dump()
        assert data["document_name"] == "健康险主险条款"
        assert data["clause_number"] == "4.2"
        assert data["exact_quote"] == "安心免赔额为人民币一千元整。"

    def test_citations_field_in_policy_coverage_schema(self):
        policy = PolicyCoverageSchema(
            is_covered=True,
            coverage_reason="主险覆盖",
            applicable_clauses=[],
            citations=[
                SourceCitation(
                    document_name="汽车保险综合条款",
                    clause_number="第六条",
                    exact_quote="行车责任保险承保被保险人依法应当承担的赔偿责任。",
                )
            ],
        )
        assert len(policy.citations) == 1
        assert policy.citations[0].document_name == "汽车保险综合条款"

    def test_citations_field_in_claim_decision_schema(self):
        decision = ClaimDecisionSchema(
            decision="approve",
            confidence=0.9,
            reasoning="OK",
            recommended_amount=30000.0,
            citations=[
                SourceCitation(
                    document_name="健康险主险条款",
                    clause_number="第十二条",
                    exact_quote="住院天数以实际住院天数为准。",
                )
            ],
        )
        assert len(decision.citations) == 1
        assert decision.citations[0].clause_number == "第十二条"

    def test_citations_defaults_to_empty_list_when_omitted(self):
        decision = ClaimDecisionSchema(
            decision="human_review",
            confidence=0.5,
            reasoning="insufficient context",
            recommended_amount=0.0,
        )
        assert decision.citations == []


# ===========================================================================
# _build_citation_index helper
# ===========================================================================

class TestBuildCitationIndex:
    """Verify citation index formatting for prompt injection."""

    def test_should_return_no_docs_message_when_empty(self):
        result = _build_citation_index([])
        assert "No source documents" in result

    def test_should_number_entries_starting_from_one(self):
        docs = [
            {"source": "汽车保险综合条款", "category": "clause",
             "text": "被保险车辆发生碰撞事故。", "score": 0.9},
            {"source": "理赔操作指引", "category": "process",
             "text": "投保人须在出险各48小时内报案。", "score": 0.8},
        ]
        result = _build_citation_index(docs)
        assert "[1]" in result
        assert "[2]" in result
        assert "汽车保险综合条款" in result
        assert "理赔操作指引" in result

    def test_should_include_source_and_category_per_entry(self):
        docs = [{
            "source": "健康险主险",
            "category": "clause",
            "text": "临时于第十六条规定赔付。",
            "score": 0.95,
        }]
        result = _build_citation_index(docs)
        assert 'source="健康险主险"' in result
        assert 'category=CLAUSE' in result

    def test_should_truncate_text_to_400_chars(self):
        long_text = "条款内容" * 200  # 800 chars
        docs = [{"source": "长文档", "category": "clause", "text": long_text, "score": 0.5}]
        result = _build_citation_index(docs)
        # The indexed block should not contain the full 800 chars
        assert len(result) < 800 + 100  # +100 for header overhead

    def test_should_handle_missing_fields_gracefully(self):
        docs = [{}]  # completely empty doc
        result = _build_citation_index(docs)
        assert "[1]" in result  # still numbered
        assert "unknown" in result  # default source


# ===========================================================================
# dynamic_keys propagation tests
# ===========================================================================

class TestDynamicKeysPropagation:
    """Verify that dynamic API keys propagate correctly and settings are fallback-safe."""

    async def test_dynamic_keys_in_instantiate_llm(self):
        from app.services.ai.llm_factory import _instantiate_llm
        dynamic_keys = {"ANTHROPIC_API_KEY": "dyn-anthropic-key-123"}
        
        with patch("langchain_anthropic.ChatAnthropic") as mock_anthropic:
            _instantiate_llm("anthropic", "claude-3-haiku", dynamic_keys)
            mock_anthropic.assert_called_once()
            kwargs = mock_anthropic.call_args[1]
            assert kwargs["anthropic_api_key"] == "dyn-anthropic-key-123"

    async def test_dynamic_keys_in_get_structured_llm(self):
        from app.services.ai.llm_factory import get_structured_llm
        dynamic_keys = {"GEMINI_API_KEY": "dyn-gemini-key-456"}
        
        with patch("langchain_google_genai.ChatGoogleGenerativeAI") as mock_gemini, \
             patch("langchain_anthropic.ChatAnthropic") as mock_anthropic:
            # We don't care about return value, just that instantiation receives keys
            try:
                get_structured_llm(DamageAssessmentSchema, "gemini-1.5-flash", dynamic_keys)
            except Exception:
                pass
            mock_gemini.assert_called_once()
            kwargs = mock_gemini.call_args[1]
            assert kwargs["google_api_key"] == "dyn-gemini-key-456"

    async def test_orchestrator_propagates_dynamic_keys(self, medical_claim, mock_db):
        orchestrator = ClaimsAIOrchestrator()
        dynamic_keys = {
            "ANTHROPIC_API_KEY": "dyn-anth-789",
            "GEMINI_API_KEY": "dyn-gem-789"
        }

        # Mock the individual agent runners to check parameter receipt
        orchestrator._run_rag_agent = AsyncMock(return_value=("context", []))
        orchestrator._run_damage_agent = AsyncMock(return_value={})
        orchestrator._run_policy_agent = AsyncMock(return_value={})
        orchestrator._run_decision_agent = AsyncMock(return_value={"decision": "approve", "confidence": 0.9, "recommended_amount": 100})

        await orchestrator.analyze_claim(medical_claim, mock_db, dynamic_keys=dynamic_keys)

        orchestrator._run_rag_agent.assert_called_once_with(
            claim_type=medical_claim.claim_type,
            description=medical_claim.incident_description,
            dynamic_keys=dynamic_keys
        )
        orchestrator._run_damage_agent.assert_called_once_with(
            claim_type=medical_claim.claim_type,
            claimed_amount=medical_claim.claimed_amount,
            description=medical_claim.incident_description,
            ocr_data={},
            rag_context="context",
            dynamic_keys=dynamic_keys
        )

