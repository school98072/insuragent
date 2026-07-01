"""
Claims AI Orchestrator — Production Multi-Agent Pipeline
=========================================================
Architecture (sequential agent chain):

  [Claim Input + OCR data]
         │
         ▼
  [RAG Agent]  →  retrieve relevant policy clauses via RAGService
         │         returns (context_str, raw_docs) with source metadata
         ▼
  [Damage Agent]  →  assess loss & estimate payout via DamageAssessmentSchema
         │
         ▼
  [Policy Agent]  →  validate coverage via PolicyCoverageSchema + SourceCitation
         │
         ▼
  [Decision Agent]  →  final ruling via ClaimDecisionSchema + SourceCitation
         │
         ▼
  {decision, confidence, reasoning, recommended_amount, citations, metadata}

All agents use ``get_structured_llm`` from ``llm_factory`` — benefiting from
HA circuit-breaking and multi-vendor fallback.  Direct Anthropic SDK usage
has been removed entirely.

Citation discipline:
  Every structured output that references policy clauses MUST populate its
  ``citations`` list from the RAG context provided.  Fabricating clause numbers
  or document names that do not appear in the context is strictly prohibited.
  If the context is insufficient, the agent must degrade gracefully (empty
  citations list) rather than hallucinate.
"""
import json
from typing import Optional, Dict, Any, List, Literal, Tuple

from pydantic import BaseModel, Field

from app.core.config import settings
from app.utils.logger import get_logger
from app.services.ai.llm_factory import get_structured_llm
from langchain_core.messages import SystemMessage, HumanMessage

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Global in-memory session store (demonstration / single-instance only)
# ---------------------------------------------------------------------------
_SESSION_STORE: Dict[str, Dict] = {}


# ===========================================================================
# Agent Pydantic Schemas
# ===========================================================================

class SourceCitation(BaseModel):
    """
    A single traceable reference to a policy document clause.

    Citation Discipline Rules (enforced via Prompt):
      - ``document_name`` MUST match a ``[source]`` tag from the RAG context.
      - ``clause_number`` MUST appear verbatim in the retrieved text (e.g. "第16条", "16.2").
        Leave as empty string "" if no explicit clause number is present in the source.
      - ``exact_quote`` MUST be a word-for-word substring (≤120 chars) from the source text.
        Never paraphrase or summarise; copy directly.
      - If the RAG context cannot support a citation, omit the entry entirely.
        Zero citations is valid; fabricated citations are not.
    """
    document_name: str = Field(
        description=(
            "Exact document / policy title as it appears in the RAG source tag, "
            "e.g. '汽车保险综合条款' or 'Health Insurance Master Policy'."
        )
    )
    clause_number: str = Field(
        default="",
        description=(
            "Verbatim clause or section identifier found in the retrieved text, "
            "e.g. '第十六条', '16.2', 'Section 4(b)'.  Empty string if not explicitly stated."
        )
    )
    exact_quote: str = Field(
        description=(
            "A verbatim excerpt (≤120 characters) copied directly from the retrieved chunk. "
            "Must be a literal substring of the source text — never paraphrase."
        )
    )


class DamageAssessmentSchema(BaseModel):
    """Output of the Damage Agent: quantified loss evaluation."""
    estimated_amount: float = Field(
        description="Estimated total payout amount in CNY (¥). Based on OCR data and market rates."
    )
    damage_severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Overall severity classification of the claim."
    )
    notes: str = Field(
        description="Detailed Chinese/English reasoning for the estimate, including any red flags."
    )
    red_flags: List[str] = Field(
        default_factory=list,
        description="List of suspicious items, inconsistencies, or items requiring fraud review."
    )


class PolicyCoverageSchema(BaseModel):
    """Output of the Policy Agent: coverage validation against contract terms."""
    is_covered: bool = Field(
        description="True if the claim falls within the insured scope under the policy."
    )
    coverage_reason: str = Field(
        description="Explanation referencing specific policy clauses or exclusions."
    )
    applicable_clauses: List[str] = Field(
        default_factory=list,
        description="List of relevant policy clause identifiers / titles."
    )
    deductible_applied: float = Field(
        default=0.0,
        description="Deductible amount to subtract from the payout in CNY (¥)."
    )
    citations: List[SourceCitation] = Field(
        default_factory=list,
        description=(
            "Traceable references to the exact RAG-retrieved policy clauses that support "
            "this coverage determination.  Each entry must cite a real document_name, "
            "clause_number, and exact_quote found verbatim in the provided Policy Knowledge Base. "
            "Leave empty if the context is insufficient — never fabricate."
        )
    )


class ClaimDecisionSchema(BaseModel):
    """Output of the Decision Agent: final binding claim ruling."""
    decision: Literal["approve", "reject", "partial_approve", "human_review"] = Field(
        description=(
            "Final claim decision:\n"
            "  'approve'         — full payout recommended\n"
            "  'partial_approve' — partial payout after deductions / exclusions\n"
            "  'reject'          — claim not covered or fraudulent\n"
            "  'human_review'    — insufficient data or high ambiguity, escalate to adjuster"
        )
    )
    confidence: float = Field(
        description="Model confidence in this decision, between 0.0 (uncertain) and 1.0 (certain)."
    )
    reasoning: str = Field(
        description=(
            "Step-by-step bilingual reasoning explaining the decision, "
            "citing clause references and damage findings."
        )
    )
    recommended_amount: float = Field(
        description="Final recommended payout amount in CNY (¥). 0.0 for rejections."
    )
    citations: List[SourceCitation] = Field(
        default_factory=list,
        description=(
            "Consolidated traceable references to all policy clauses that determined this ruling. "
            "Merge the most important citations from upstream Policy and Damage agents. "
            "Each entry must map to a real document_name + clause_number + exact_quote "
            "found verbatim in the Policy Knowledge Context provided.  "
            "Zero citations is acceptable; invented citations are a compliance violation."
        )
    )


# ===========================================================================
# ClaimsAIOrchestrator
# ===========================================================================

class ClaimsAIOrchestrator:
    """
    Multi-agent orchestrator for end-to-end insurance claim analysis.

    Coordinates four specialised LLM agents in sequence:
      1. RAG Agent     — dynamic policy knowledge retrieval
      2. Damage Agent  — loss quantification
      3. Policy Agent  — coverage validation
      4. Decision Agent — final ruling

    All agents use ``get_structured_llm`` for HA circuit-breaking.
    """

    def __init__(self) -> None:
        # Keep _client attribute for backward-compat with unit-test fixtures that
        # inject a mock_anthropic_client.  In production this attribute is unused.
        try:
            from anthropic import AsyncAnthropic
            self._client = AsyncAnthropic()
        except Exception:
            self._client = None
        self.model = settings.DEFAULT_LLM_MODEL

    # ------------------------------------------------------------------
    # Helper: extract JSON from free-text LLM response (legacy path)
    # ------------------------------------------------------------------

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Extract and parse the first JSON object found in a free-text LLM response."""
        import re
        if not text:
            return {}
        try:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        return {}

    # ------------------------------------------------------------------
    # Chat — routes to DialogEngine
    # ------------------------------------------------------------------

    async def chat(
        self,
        message: str,
        user_id: str,
        claim_id: Optional[str] = None,
        session_id: Optional[str] = None,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Conversational entry-point. Delegates to the stateful DialogEngine
        and persists session state across turns.
        """
        from app.services.ai.dialog import DialogEngine
        from app.utils.database import SessionLocal
        from app.models.user import User
        from app.models.claim import Claim
        
        # 1. Determine if claim filing intake is allowed for this context
        is_filing_allowed = True  # Default to True for compatibility (e.g., unit tests)
        import uuid
        
        is_valid_user_uuid = False
        try:
            if user_id:
                uuid.UUID(str(user_id))
                is_valid_user_uuid = True
        except ValueError:
            pass

        if is_valid_user_uuid:
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == uuid.UUID(str(user_id))).first()
                if user:
                    user_role = user.role.value if hasattr(user.role, 'value') else user.role
                    if user_role == "ROLE_BROKER":
                        if claim_id:
                            try:
                                uuid.UUID(str(claim_id))
                                claim = db.query(Claim).filter(Claim.id == uuid.UUID(str(claim_id))).first()
                                if claim:
                                    claim_status = claim.status.value if hasattr(claim.status, 'value') else claim.status
                                    is_filing_allowed = (claim_status == "draft")
                                else:
                                    is_filing_allowed = False
                            except ValueError:
                                is_filing_allowed = False
                        else:
                            is_filing_allowed = True
                    else:
                        is_filing_allowed = False
            except Exception as e:
                logger.error(f"[Agents] Chat context DB lookup failed: {e}")
            finally:
                db.close()

        # Load chat history from DB if claim_id is provided
        db_history = []
        if claim_id:
            try:
                db = SessionLocal()
                claim = db.query(Claim).filter(Claim.id == uuid.UUID(str(claim_id))).first()
                if claim:
                    meta = claim.ai_metadata or {}
                    db_history = meta.get("chat_history", [])
            except Exception as e:
                logger.error(f"[Agents] Failed to load chat history from DB: {e}")
            finally:
                db.close()

        engine = DialogEngine()

        session_id = session_id or (f"claim_{claim_id}" if claim_id else "default_session")
        if session_id not in _SESSION_STORE:
            _SESSION_STORE[session_id] = {
                "history": db_history,
                "collected_data": {},
                "session_state": {},
            }
        else:
            # Sync to keep updated DB history
            if db_history and len(db_history) > len(_SESSION_STORE[session_id]["history"]):
                _SESSION_STORE[session_id]["history"] = db_history

        session = _SESSION_STORE[session_id]

        result = await engine.process_message(
            message=message,
            history=session["history"],
            collected_data=session["collected_data"],
            session_state=session["session_state"],
            dynamic_keys=dynamic_keys,
            is_filing_allowed=is_filing_allowed,
            claim_id=claim_id,
        )

        session["history"].append({"role": "user", "content": message})
        session["history"].append({"role": "assistant", "content": result["reply"]})
        session["collected_data"] = result["collected_data"]
        session["session_state"] = result["session_state"]

        # Persist updated history back to DB
        if claim_id:
            try:
                db = SessionLocal()
                claim = db.query(Claim).filter(Claim.id == uuid.UUID(str(claim_id))).first()
                if claim:
                    meta = dict(claim.ai_metadata or {})
                    meta["chat_history"] = session["history"]
                    claim.ai_metadata = meta
                    db.commit()
            except Exception as e:
                logger.error(f"[Agents] Failed to persist chat history to DB: {e}")
            finally:
                db.close()

        return result["reply"]

    # ------------------------------------------------------------------
    # analyze_claim — full multi-agent pipeline
    # ------------------------------------------------------------------

    async def analyze_claim(
        self,
        claim,
        db,
        ocr_data: Dict[str, Any] = None,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        End-to-end claim analysis through the 4-agent pipeline.

        Args:
            claim:        ORM or SimpleNamespace with claim attributes.
            db:           SQLAlchemy session (used for policy lookup if needed).
            ocr_data:     Pre-extracted OCR structured data (optional).
            dynamic_keys: Optional custom API keys for dynamic key billing.

        Returns:
            A dict with keys: decision, confidence, reasoning,
            recommended_amount, metadata (containing damage_assessment and
            policy_coverage sub-dicts).
        """
        ocr_data = ocr_data or {}

        claim_type = getattr(claim, "claim_type", "")
        description = getattr(claim, "incident_description", "")
        claimed_amount = getattr(claim, "claimed_amount", 0)
        policy_number = getattr(claim, "policy_number", "")

        # Run security guardrails (sanitisation and PII masking)
        try:
            from app.utils.security import SecurityGuardrails
            guardrails = SecurityGuardrails()
            description = guardrails.sanitize_input(description)
        except Exception:
            pass

        # ------------------------------------------------------------------
        # STAGE 0 — RAG: retrieve relevant policy clauses + raw doc corpus
        # ------------------------------------------------------------------
        rag_context_text, rag_docs = await self._run_rag_agent(
            claim_type=claim_type,
            description=description,
            dynamic_keys=dynamic_keys,
        )

        # ------------------------------------------------------------------
        # STAGE 1 — Damage Agent
        # ------------------------------------------------------------------
        damage_json = await self._run_damage_agent(
            claim_type=claim_type,
            claimed_amount=claimed_amount,
            description=description,
            ocr_data=ocr_data,
            rag_context=rag_context_text,
            dynamic_keys=dynamic_keys,
        )

        # ------------------------------------------------------------------
        # STAGE 2 — Policy Agent
        # ------------------------------------------------------------------
        policy_json = await self._run_policy_agent(
            claim_type=claim_type,
            description=description,
            damage_assessment=damage_json,
            rag_context=rag_context_text,
            rag_docs=rag_docs,
            db=db,
            policy_number=policy_number,
            dynamic_keys=dynamic_keys,
        )

        # ------------------------------------------------------------------
        # STAGE 3 — Decision Agent
        # ------------------------------------------------------------------
        result = await self._run_decision_agent(
            claim_type=claim_type,
            description=description,
            claimed_amount=claimed_amount,
            damage_assessment=damage_json,
            policy_coverage=policy_json,
            rag_context=rag_context_text,
            rag_docs=rag_docs,
            dynamic_keys=dynamic_keys,
        )

        # ------------------------------------------------------------------
        # STAGE 4 — Safety Guardrails & Checklist Verification
        # ------------------------------------------------------------------
        missing_docs = self._check_required_docs_missing(claim_type, getattr(claim, "documents", []))
        anomalies_list = []
        
        # Run advanced ML anomaly check (Isolation Forest / Outlier check)
        try:
            from app.utils.anomaly_detection import TransactionAuditSkills
            skills = TransactionAuditSkills()
            
            # Extract incident hour and amount
            incident_hour = 12 # Default to standard business hours
            inc_date = getattr(claim, "incident_date", None)
            if isinstance(inc_date, datetime):
                incident_hour = inc_date.hour
            elif hasattr(inc_date, "hour"):
                incident_hour = inc_date.hour
                
            is_anomaly = skills.detect_outliers([float(claimed_amount), float(incident_hour)])
            if is_anomaly:
                anomalies_list.append({
                    "title": "ML Outlier Check Alert / 機器學習異常警示",
                    "description": f"The claim triggers our ML anomaly audit rule (off-hours operation or excessive amount variance). Detected transaction hour: {incident_hour}:00."
                })
                # Set decision to human review due to ML risk flags
                if result.get("decision") in ["approve", "partial_approve"]:
                    result["decision"] = "human_review"
                    result["confidence"] = 0.65
                    result["reasoning"] = (
                        f"【System ML Anomaly Alert / 系統異常指標攔截】\n"
                        f"This transaction has been flagged by our ML Isolation Forest rules (outlier in amount/timestamp values).\n"
                        f"Original AI decision was '{result.get('decision')}' with confidence {result.get('confidence')*100:.0f}%, "
                        f"but auto-approval is blocked pending a manual audit of the off-hours submission or high variance.\n"
                        f"\n\n---\n\n"
                        + result.get("reasoning", "")
                    )
        except Exception:
            # Fallback if anomaly checks fail or parameters are incompatible
            pass
        
        # Pull existing red flags from damage assessment to surface them as UI anomalies
        for rf in damage_json.get("red_flags", []):
            anomalies_list.append({
                "title": "Risk Flag / 风险警示",
                "description": rf
            })
            
        if missing_docs:
            anomalies_list.append({
                "title": "Missing Required Documents",
                "description": f"The following mandatory files were not uploaded or matched: {', '.join(missing_docs)}."
            })
            
            # Override approve/partial_approve to human_review if mandatory documents are missing
            if result.get("decision") in ["approve", "partial_approve"]:
                result["decision"] = "human_review"
                result["confidence"] = 0.70
                result["reasoning"] = (
                    f"【System Guardrail Alert / 系統安全攔截】\n"
                    f"The claim was automatically flagged for Adjuster Human Review because the following required "
                    f"documents are missing:\n"
                    + "\n".join(f"- {doc}" for doc in missing_docs)
                    + f"\n\nOriginal AI decision was '{result.get('decision')}' with confidence {result.get('confidence')*100:.0f}%, "
                    f"but auto-approval is blocked until all required evidence is uploaded."
                    f"\n\n---\n\n"
                    + result.get("reasoning", "")
                )

        result["metadata"] = {
            "damage_assessment": damage_json,
            "policy_coverage": policy_json,
            "rag_sources": [d["source"] for d in rag_docs],
            "anomalies": anomalies_list
        }
        return result

    def _check_required_docs_missing(self, claim_type: str, documents: List[Any]) -> List[str]:
        """
        Check if any required documents for the claim type are missing based on filename keywords.
        """
        REQUIRED_DOCS = {
            "auto": [
                {"name": "Police Report / Accident Report", "keywords": ["police", "report", "accident", "事故", "公安", "認定", "认定", "协议书", "協議書"]},
                {"name": "Repair Estimate / Invoice", "keywords": ["repair", "estimate", "invoice", "receipt", "bill", "维修", "估价", "发票", "發票", "帳單", "账单", "收据", "收據"]},
                {"name": "Scene Photos", "keywords": ["image", "photo", "site", "damage", "pic", "jpg", "png", "jpeg", "照片", "现场", "現場", "圖片", "图片"]}
            ],
            "health": [
                {"name": "Medical Invoice / Bill", "keywords": ["invoice", "medical", "bill", "receipt", "医疗", "醫療", "发票", "發票", "收据", "收據", "帳單", "账单"]},
                {"name": "Diagnosis Report / Discharge Summary", "keywords": ["diagnosis", "report", "discharge", "summary", "诊断", "診斷", "出院", "小结", "小結", "病历", "病歷"]}
            ],
            "property": [
                {"name": "Damage Photos", "keywords": ["image", "photo", "damage", "jpg", "png", "照片", "现场", "現場", "圖片", "图片"]},
                {"name": "Purchase Receipt / Estimate", "keywords": ["receipt", "invoice", "purchase", "estimate", "发票", "發票", "收据", "收據", "估价", "估價", "帳單", "账单"]}
            ],
            "life": [
                {"name": "Death Certificate / Medical Report", "keywords": ["death", "certificate", "medical", "report", "死亡", "证明", "證明", "医学", "醫學", "报告", "報告"]},
                {"name": "Beneficiary ID", "keywords": ["id", "identity", "passport", "身份", "身份证", "身份證", "護照", "护照"]}
            ]
        }
        
        ct = str(claim_type).lower().strip()
        if ct not in REQUIRED_DOCS:
            return []
            
        uploaded_filenames = []
        for d in documents:
            if isinstance(d, dict):
                uploaded_filenames.append(d.get("file_name", "").lower())
            else:
                uploaded_filenames.append(getattr(d, "file_name", "").lower())
                
        missing = []
        for req in REQUIRED_DOCS[ct]:
            satisfied = False
            for fname in uploaded_filenames:
                if any(k in fname for k in req["keywords"]):
                    satisfied = True
                    break
            if not satisfied:
                missing.append(req["name"])
                
        return missing

    # ==================================================================
    # Private agent runners
    # ==================================================================

    async def _run_rag_agent(
        self,
        claim_type: str,
        description: str,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieve the top policy clauses most relevant to this claim using
        RAGService semantic search.

        Returns:
            (context_str, raw_docs)
            - context_str:  Formatted text block injected into Agent system prompts.
            - raw_docs:     Raw list of dicts [{source, text, score, category}] so that
                            downstream agents can verify citations against the actual corpus.
        """
        try:
            from app.services.ai.rag import RAGService
            rag = RAGService()
            query = f"{claim_type} {description}".strip()
            docs = await rag.search(query, top_k=8, dynamic_keys=dynamic_keys)  # fetch more for richer citation pool
            if not docs:
                return "No relevant policy clauses retrieved.", []

            # Build numbered citation index so the LLM can reference entries precisely
            lines = [
                f"[DOC-{i+1}] [{d['category'].upper()}] source=\"{d['source']}\" score={d['score']:.3f}\n"
                f"{d['text']}"
                for i, d in enumerate(docs)
            ]
            context = "\n\n".join(lines)
            logger.info(
                f"[Agents] RAG retrieved {len(docs)} clauses for '{claim_type}' "
                f"(sources: {[d['source'] for d in docs]})"
            )
            return context, docs
        except Exception as exc:
            logger.warning(f"[Agents] RAG retrieval failed: {exc}. Continuing without context.")
            return "RAG retrieval unavailable.", []

    async def _run_damage_agent(
        self,
        claim_type: str,
        claimed_amount: float,
        description: str,
        ocr_data: Dict[str, Any],
        rag_context: str,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Damage Agent: quantify loss using OCR data + RAG context.
        Primary: ``get_structured_llm(DamageAssessmentSchema)``
        Fallback: safe default dict
        """
        try:
            llm, provider = get_structured_llm(DamageAssessmentSchema, self.model, dynamic_keys)
            logger.debug(f"[Agents] Damage Agent using provider={provider}")

            system = SystemMessage(content=(
                "You are a senior insurance loss adjuster with expertise in both medical "
                "and auto insurance claims. Evaluate the damage and estimate a fair payout.\n\n"
                "=== Relevant Policy Context (RAG-Retrieved) ===\n"
                f"{rag_context}\n\n"
                "=== Instructions ===\n"
                "1. Cross-reference the OCR extracted data with market rates.\n"
                "2. Identify any red flags (inflated costs, pre-existing conditions, fraud signals).\n"
                "3. Output a precise estimated payout with severity classification.\n"
                "4. Be bilingual-aware: write your notes in the same language as the claim description.\n"
                "5. Do NOT invent market prices or policy limits not supported by the context above."
            ))
            human = HumanMessage(content=(
                f"Claim Type: {claim_type}\n"
                f"Claimed Amount: ¥{claimed_amount}\n"
                f"Incident Description: {description}\n"
                f"OCR Extracted Data: {json.dumps(ocr_data, ensure_ascii=False, indent=2)}"
            ))

            result: DamageAssessmentSchema = await llm.ainvoke([system, human])
            return result.model_dump()

        except Exception as exc:
            logger.error(f"[Agents] Damage Agent failed: {exc}", exc_info=True)
            return {
                "estimated_amount": 0.0,
                "damage_severity": "medium",
                "notes": "Damage assessment unavailable — manual review required.",
                "red_flags": [],
            }

    async def _run_policy_agent(
        self,
        claim_type: str,
        description: str,
        damage_assessment: Dict[str, Any],
        rag_context: str,
        rag_docs: List[Dict[str, Any]],
        db,
        policy_number: str,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Policy Agent: validate coverage against retrieved clauses.
        Primary: ``get_structured_llm(PolicyCoverageSchema)``
        Fallback: safe default dict
        """
        try:
            llm, provider = get_structured_llm(PolicyCoverageSchema, settings.CLAUSE_AGENT_MODEL, dynamic_keys)
            logger.debug(f"[Agents] Policy Agent using provider={provider}")

            # Build a compact citation index for the LLM to reference
            citation_index = _build_citation_index(rag_docs)

            system = SystemMessage(content=(
                "You are a chief compliance officer specialising in insurance contract analysis.\n"
                "Evaluate whether this claim is covered under the policy, citing specific clauses.\n\n"
                "=== Policy Knowledge Base (RAG-Retrieved, Numbered for Citation) ===\n"
                f"{rag_context}\n\n"
                "=== Citation Discipline — MANDATORY ===\n"
                "You MUST populate the `citations` list with traceable references.\n"
                "Rules (violation = compliance failure):\n"
                "  • `document_name`: copy EXACTLY from a source= tag above (e.g. '汽车保险综合条款').\n"
                "  • `clause_number`: copy VERBATIM from the text (e.g. '第十六条', '16.2').\n"
                "    Use empty string \"\" if no clause number is stated in the retrieved text.\n"
                "  • `exact_quote`: paste a ≤120-char verbatim substring from that document's text.\n"
                "  • NEVER invent a document name, clause number, or quote not present above.\n"
                "  • If the context is insufficient to cite, leave citations as an empty list [].\n\n"
                f"=== Available Source Documents ===\n{citation_index}\n\n"
                "=== Instructions ===\n"
                "1. Check whether the claim type and description fall within insured scope.\n"
                "2. Identify any applicable exclusions (既往症, 免赔额, 等待期, etc.).\n"
                "3. List the specific clause identifiers / titles that are relevant.\n"
                "4. State the deductible amount that should be applied.\n"
                "5. Be bilingual-aware: mirror the language of the claim description."
            ))
            human = HumanMessage(content=(
                f"Policy Number: {policy_number}\n"
                f"Claim Type: {claim_type}\n"
                f"Incident Description: {description}\n"
                f"Damage Assessment: {json.dumps(damage_assessment, ensure_ascii=False, indent=2)}"
            ))

            result: PolicyCoverageSchema = await llm.ainvoke([system, human])
            return result.model_dump()

        except Exception as exc:
            logger.error(f"[Agents] Policy Agent failed: {exc}", exc_info=True)
            return {
                "is_covered": False,
                "coverage_reason": "Policy evaluation unavailable — defaulting to manual review.",
                "applicable_clauses": [],
                "deductible_applied": 0.0,
                "citations": [],
            }

    async def _run_decision_agent(
        self,
        claim_type: str,
        description: str,
        claimed_amount: float,
        damage_assessment: Dict[str, Any],
        policy_coverage: Dict[str, Any],
        rag_context: str,
        rag_docs: List[Dict[str, Any]],
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Decision Agent: synthesise all upstream outputs into a final ruling.
        Primary: ``get_structured_llm(ClaimDecisionSchema)``
        Fallback: human_review default
        """
        try:
            llm, provider = get_structured_llm(ClaimDecisionSchema, settings.DECISION_AGENT_MODEL, dynamic_keys)
            logger.debug(f"[Agents] Decision Agent using provider={provider}")

            citation_index = _build_citation_index(rag_docs)

            system = SystemMessage(content=(
                "You are the final adjudication AI for an insurance claims system.\n"
                "Synthesise the damage assessment, policy coverage analysis, and policy knowledge "
                "to reach a definitive, well-reasoned claim decision.\n\n"
                "=== Policy Knowledge Context (RAG-Retrieved) ===\n"
                f"{rag_context}\n\n"
                "=== Citation Discipline — MANDATORY ===\n"
                "The `citations` field in your output MUST contain traceable clause references.\n"
                "Zero-tolerance fabrication rules:\n"
                "  • `document_name`: MUST match a source= tag shown above — no invention.\n"
                "  • `clause_number`: MUST appear verbatim in the chunk text (e.g. '第十六条').\n"
                "    Use \"\" if no clause number is explicitly stated in the retrieved text.\n"
                "  • `exact_quote`:   MUST be a ≤120-char verbatim copy from the chunk.\n"
                "  • If no clause in the context supports your decision, citations = [].\n"
                "  • NEVER invent document names, clause IDs, or quotes. This is a compliance audit trail.\n\n"
                f"=== Available Source Documents ===\n{citation_index}\n\n"
                "=== Decision Criteria ===\n"
                "• approve:         damage is validated, claim is fully covered, no red flags\n"
                "• partial_approve: covered but with deductibles, exclusions, or suspicious items\n"
                "• reject:          not covered, fraudulent indicators, or clear policy breach\n"
                "• human_review:    ambiguous evidence, conflicting signals, or very high amount\n\n"
                "=== Instructions ===\n"
                "1. Compute recommended_amount = estimated_amount – deductible_applied.\n"
                "2. Assign 0.0 for rejections.\n"
                "3. Express confidence based on evidence strength (0.0–1.0).\n"
                "4. Write step-by-step bilingual reasoning citing specific clause numbers.\n"
                "5. Populate citations from the RAG context above — not from memory.\n"
                "6. Be conservative: when in doubt, route to human_review."
            ))
            human = HumanMessage(content=(
                f"Claim Type: {claim_type}\n"
                f"Incident Description: {description}\n"
                f"Claimed Amount: ¥{claimed_amount}\n\n"
                f"Damage Assessment:\n{json.dumps(damage_assessment, ensure_ascii=False, indent=2)}\n\n"
                f"Policy Coverage (including upstream citations):\n"
                f"{json.dumps(policy_coverage, ensure_ascii=False, indent=2)}"
            ))

            result: ClaimDecisionSchema = await llm.ainvoke([system, human])
            return result.model_dump()

        except Exception as exc:
            logger.error(f"[Agents] Decision Agent failed: {exc}", exc_info=True)
            return {
                "decision": "human_review",
                "confidence": 0.5,
                "reasoning": "Decision agent unavailable — claim requires manual adjudication.",
                "recommended_amount": 0.0,
                "citations": [],
            }


# ===========================================================================
# Module-level helpers
# ===========================================================================

def _build_citation_index(rag_docs: List[Dict[str, Any]]) -> str:
    """
    Build a compact, numbered citation index from raw RAG documents.

    Output format (one block per document)::

        [1] source="汽车保险综合条款"  category=CLAUSE
            被保险车辆发生碰撞事故，经核定属于保险责任范围内的，予以赔付。

    This gives the LLM an unambiguous mapping between document names and their
    text, making it far easier to populate SourceCitation fields accurately.
    """
    if not rag_docs:
        return "(No source documents available)"
    blocks = []
    for i, doc in enumerate(rag_docs, start=1):
        source = doc.get("source", "unknown")
        category = doc.get("category", "clause").upper()
        text = doc.get("text", "")[:400]  # cap to keep prompt manageable
        blocks.append(
            f'[{i}] source="{source}"  category={category}\n    {text}'
        )
    return "\n\n".join(blocks)
