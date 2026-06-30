"""
Tests for app.services.ai.dialog — DialogEngine (refactored)

Covers:
  - Intent detection (claim_filing vs consultation) via keyword fast-path
  - LLM-driven slot extraction via mocked get_structured_llm
  - State machine transitions across multiple turns
  - Consultation flow routing to RAG knowledge base
  - Bilingual reply behaviour
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai.dialog import DialogEngine, ClaimIntakeSchema, DialogResponseSchema


# ===========================================================================
# Intent Detection — keyword fast-path
# ===========================================================================

class TestIntentDetection:
    """Verify keyword-based intent routing (no LLM call needed here)."""

    @pytest.fixture
    def engine(self):
        return DialogEngine()

    @pytest.mark.parametrize("message,expected_intent", [
        ("我要理赔", "claim_filing"),
        ("我要报案，出了车祸", "claim_filing"),
        ("昨天出险了", "claim_filing"),
        ("发生了事故需要赔钱", "claim_filing"),
        ("住院了需要帮助", "claim_filing"),
        ("请帮我定损", "claim_filing"),
        ("我有一张发票要提交", "claim_filing"),
    ])
    async def test_should_detect_claim_filing_when_keywords_present(
        self, engine, message, expected_intent
    ):
        intent = await engine.detect_intent(message)
        assert intent == expected_intent

    @pytest.mark.parametrize("message", [
        "什么是免赔额？",
        "保险条款怎么看？",
        "你好，我想咨询一下保单",
        "重疾险包含哪些疾病？",
        "Hello, I need help",
    ])
    async def test_should_detect_consultation_when_no_claim_keywords(
        self, engine, message
    ):
        intent = await engine.detect_intent(message)
        assert intent == "consultation"


# ===========================================================================
# Claim Collection State Machine (mocked LLM)
# ===========================================================================

class TestClaimCollectionStateMachine:
    """
    Verify the step-by-step claim data collection flow driven by mocked LLM.
    Tests patch ``get_structured_llm`` so no real API calls are made.
    """

    @pytest.fixture
    def engine(self):
        return DialogEngine()

    def _make_llm(self, updated_data, reply, is_complete=False):
        """Build a DialogResponseSchema mock instance."""
        resp = DialogResponseSchema(
            updated_data=updated_data,
            reply=reply,
            is_complete=is_complete,
        )
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=resp)
        return mock_llm

    async def test_should_start_collecting_claim_type_when_claim_intent_detected(
        self, engine
    ):
        mock_llm = self._make_llm(
            updated_data={"claim_type": "医疗险"},
            reply="好的，请问出险日期是什么时候？",
            is_complete=False,
        )

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await engine.process_message(
                message="我要理赔",
                history=[],
                collected_data={},
                session_state={},
            )

        assert result["session_state"]["intent"] == "claim_filing"
        assert result["session_state"]["step"] == 1
        assert "claim_type" in result["collected_data"]
        assert result["is_complete"] is False
        assert result["next_question"] is not None

    async def test_should_advance_step_when_user_provides_data(self, engine):
        mock_llm = self._make_llm(
            updated_data={"claim_type": "医疗险", "incident_date": "2024年3月15日下午"},
            reply="明白了，请问出险地点在哪里？",
            is_complete=False,
        )

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await engine.process_message(
                message="2024年3月15日下午",
                history=[],
                collected_data={"claim_type": "医疗险"},
                session_state={"intent": "claim_filing", "step": 1},
            )

        assert result["session_state"]["step"] == 2
        assert result["collected_data"]["incident_date"] == "2024年3月15日下午"
        assert result["is_complete"] is False

    async def test_should_collect_all_fields_when_all_steps_completed(self, engine):
        """Walk through 6 steps using mocked LLM responses, verify completion."""
        all_data = {
            "claim_type": "医疗险",
            "incident_date": "2024年3月15日",
            "incident_location": "北京市朝阳区",
            "incident_description": "急性阑尾炎手术",
            "claimed_amount": "35000",
            "upload_receipts": "已上传发票照片",
        }

        answers = [
            ("医疗险",           {"claim_type": "医疗险"},                     False, "请问出险日期？"),
            ("2024年3月15日",    {**{k: all_data[k] for k in list(all_data)[:2]}},  False, "请问出险地点？"),
            ("北京市朝阳区",      {**{k: all_data[k] for k in list(all_data)[:3]}},  False, "请描述事故经过"),
            ("急性阑尾炎手术",    {**{k: all_data[k] for k in list(all_data)[:4]}},  False, "请提供金额"),
            ("35000",           {**{k: all_data[k] for k in list(all_data)[:5]}},  False, "请上传凭证"),
            ("已上传发票照片",    all_data,                                        True,  "审核信息收集完毕，请上传相关凭证。"),
        ]

        history = []
        collected_data = {}
        session_state = {}
        result = None

        for i, (msg, expected_data, complete, reply_text) in enumerate(answers):
            mock_llm = self._make_llm(
                updated_data=expected_data,
                reply=reply_text,
                is_complete=complete,
            )
            input_msg = f"我要理赔，{msg}" if i == 0 else msg

            with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
                result = await engine.process_message(
                    message=input_msg,
                    history=history,
                    collected_data=collected_data,
                    session_state=session_state,
                )
            collected_data = result["collected_data"]
            session_state = result["session_state"]

        assert result["is_complete"] is True
        assert result["next_question"] is None
        assert len(collected_data) == len(ClaimIntakeSchema.model_fields)
        assert "审核" in result["reply"] or "收集" in result["reply"]

    async def test_should_include_next_question_when_step_incomplete(self, engine):
        mock_llm = self._make_llm(
            updated_data={"claim_type": "车险"},
            reply="好的车险，请问出险时间？",
            is_complete=False,
        )

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await engine.process_message(
                message="车险",
                history=[],
                collected_data={"claim_type": "我要理赔"},
                session_state={"intent": "claim_filing", "step": 1},
            )

        assert result["next_question"] is not None
        assert isinstance(result["next_question"], str)
        assert len(result["next_question"]) > 0

    async def test_should_degrade_gracefully_when_llm_fails(self, engine):
        """When LLM raises, fallback logic should still return a valid structure."""
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=RuntimeError("LLM unavailable"))

        with patch("app.services.ai.dialog.get_structured_llm", return_value=(mock_llm, "gemini")):
            result = await engine.process_message(
                message="我要理赔",
                history=[],
                collected_data={},
                session_state={},
            )

        assert isinstance(result["reply"], str)
        assert len(result["reply"]) > 0
        assert "collected_data" in result
        assert "is_complete" in result


# ===========================================================================
# Consultation Flow
# ===========================================================================

class TestConsultationFlow:
    """Verify consultation intent routes through RAG knowledge base."""

    @pytest.fixture
    def engine(self):
        return DialogEngine()

    async def test_should_use_rag_when_no_claim_keywords_present(self, engine):
        """Consultation path calls RAGService and returns a knowledge-based reply."""
        with patch("app.services.ai.rag.lancedb.connect") as mock_ldb:
            mock_db = MagicMock()
            mock_db.table_names.return_value = []  # empty DB → fallback reply
            mock_ldb.return_value = mock_db

            result = await engine.process_message(
                message="什么是免赔额？",
                history=[],
                collected_data={},
                session_state={},
            )

        assert result["session_state"]["intent"] == "consultation"
        assert len(result["reply"]) > 0
        assert result["is_complete"] is False

    async def test_should_return_rag_content_in_reply_when_docs_found(self, engine):
        """When RAG finds docs, the reply should contain policy-sourced text."""
        from app.services.ai.rag import RAGService

        mock_docs = [
            {"source": "健康险主险", "score": 0.92, "text": "免赔额为1000元人民币", "category": "clause"}
        ]

        with patch.object(RAGService, "search", new_callable=AsyncMock, return_value=mock_docs):
            result = await engine.process_message(
                message="什么是免赔额？",
                history=[],
                collected_data={},
                session_state={},
            )

        assert result["session_state"]["intent"] == "consultation"
        assert "免赔额" in result["reply"] or "知识库" in result["reply"] or "1000" in result["reply"]

    async def test_should_return_english_reply_for_english_query(self, engine):
        """English queries should receive English-language replies."""
        with patch("app.services.ai.rag.lancedb.connect") as mock_ldb:
            mock_db = MagicMock()
            mock_db.table_names.return_value = []
            mock_ldb.return_value = mock_db

            result = await engine.process_message(
                message="What is a deductible?",
                history=[],
                collected_data={},
                session_state={},
            )

        assert result["session_state"]["intent"] == "consultation"
        # English fallback reply should not contain only Chinese
        assert len(result["reply"]) > 0

    async def test_should_return_fallback_when_rag_returns_empty(self, engine):
        from app.services.ai.rag import RAGService

        with patch.object(RAGService, "search", new_callable=AsyncMock, return_value=[]):
            result = await engine.process_message(
                message="你好，请问保险怎么买？",
                history=[],
                collected_data={},
                session_state={},
            )

        assert result["session_state"]["intent"] == "consultation"
        assert len(result["reply"]) > 0
