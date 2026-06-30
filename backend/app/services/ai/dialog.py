"""
Dialog Engine — Production LLM-Driven Slot Filling
====================================================
Architecture:
  • Intent detection:  keyword-triggered fast path  +  (optional) LLM semantic fallback
  • Claim filing:      fully LLM-driven slot extraction via DialogResponseSchema
  • Consultation:      RAG retrieval  +  LLM-synthesised bilingual reply

All hardcoded if-else string matching for slot filling has been removed.
The engine now uses ``get_structured_llm`` bound to ``DialogResponseSchema``
to let the model dynamically extract fields and generate follow-up questions
in whichever language the user is speaking.
"""
import json
from typing import List, Dict, Optional, Any

from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config import settings
from app.utils.logger import get_logger
from app.services.ai.llm_factory import get_structured_llm

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class ClaimIntakeSchema(BaseModel):
    """All fields required to open an insurance claim."""
    claim_type: Optional[str] = Field(None, description="理赔类型，例如医疗险、车险 / Claim type e.g. medical, auto")
    incident_date: Optional[str] = Field(None, description="出险日期或时间 / Date & time of incident")
    incident_location: Optional[str] = Field(None, description="出险地点 / Location of the incident")
    incident_description: Optional[str] = Field(None, description="事故或病情描述 / Description of the incident or illness")
    claimed_amount: Optional[str] = Field(None, description="预估理赔金额 / Estimated claim amount")
    upload_receipts: Optional[str] = Field(None, description="是否已上传发票或照片 / Whether receipts / photos have been uploaded")


class DialogResponseSchema(BaseModel):
    """Structured output from the claim-collection LLM agent."""
    updated_data: Dict[str, Any] = Field(
        description="All slot fields (previously collected + newly extracted from the latest message)"
    )
    reply: str = Field(
        description=(
            "Your next conversational message to the user.  "
            "MUST be in the same language the user used in their latest message.  "
            "If fields are missing, ask naturally for one missing field.  "
            "If all fields are complete, confirm and invite document upload."
        )
    )
    is_complete: bool = Field(
        description="True only when ALL six fields in ClaimIntakeSchema are non-null and non-empty"
    )


# ---------------------------------------------------------------------------
# Language detection helper
# ---------------------------------------------------------------------------

def _is_english(text: str) -> bool:
    """Heuristic: message is considered English if it has no CJK characters."""
    return not any("\u4e00" <= c <= "\u9fff" for c in text)


# ---------------------------------------------------------------------------
# Dialog Engine
# ---------------------------------------------------------------------------

class DialogEngine:
    """
    Stateful multi-turn dialog engine with intent recognition for guided
    insurance claim data collection.

    Claim filing uses a fully LLM-driven slot-filling loop:
      1. The model reads the conversation history and already-collected data.
      2. It extracts any newly mentioned fields from the latest user message.
      3. It decides which field to ask for next (or declares completion).
      4. It auto-adapts its reply language to match the user's input.
    """

    # Lightweight keyword signals for claim_filing fast-path detection
    _CLAIM_KEYWORDS_ZH = ["理赔", "报案", "出险", "赔钱", "住院了", "出车祸", "事故", "发票", "定损", "我要理赔"]
    _CLAIM_KEYWORDS_EN = ["claim", "accident", "hospital", "damage", "invoice", "i was in", "file a claim"]

    def __init__(self) -> None:
        self.model = settings.DIALOG_AGENT_MODEL

    async def detect_intent(
        self,
        message: str,
        history: List[Dict[str, str]] = None,
        dynamic_keys: Optional[Dict[str, str]] = None,
        current_session_intent: Optional[str] = None,
        is_filing_allowed: bool = True
    ) -> str:
        """
        Detect intent dynamically using indicators and LLM classification fallback.
        """
        msg_lower = message.lower().strip()
        
        # Check translation keywords first
        translation_indicators = ["translate", "translation", "翻译", "翻譯", "譯"]
        if any(msg_lower.startswith(ti) or (len(msg_lower) < 20 and ti in msg_lower) for ti in translation_indicators):
            return "translation"
            
        # If it's a question (starts with question keywords or ends with a question mark)
        question_indicators = ["?", "？", "what", "how", "why", "who", "when", "where", "which", "is there", "can i", "does", "如何", "什么是", "怎么", "環境", "為什麼", "为什么", "是什麽"]
        if any(qi in msg_lower for qi in question_indicators):
            return "consultation"
            
        # If we are already in claim_filing, do not switch unless it's explicitly a question/translation
        if current_session_intent == "claim_filing" and is_filing_allowed:
            return "claim_filing"
            
        intent = "consultation"
        
        # Use LLM for precise classification if it is ambiguous and not in a filing session
        import os
        from app.core.config import settings
        has_keys = (dynamic_keys or {}).get("GEMINI_API_KEY") or (dynamic_keys or {}).get("ANTHROPIC_API_KEY") or settings.GEMINI_API_KEY or settings.ANTHROPIC_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
        
        if has_keys:
            try:
                from app.services.ai.llm_factory import get_llm
                llm, provider = get_llm(dynamic_keys=dynamic_keys)
                system = (
                    "You are an intent classification agent for an insurance system.\n"
                    "Classify the user's message into one of four intents:\n"
                    "- 'translation': User wants to translate a text, word, phrase, or address.\n"
                    "- 'claim_filing': User is reporting a new claim, reporting an accident, or providing raw facts about an accident (date, location, description, amount) to file a claim.\n"
                    "- 'consultation': User is asking a specific question about insurance terms, rules, processes, or how the system works.\n"
                    "- 'ambiguous': User entered a raw phrase, isolated address, name, or entity without any clear question, instruction, or verb (e.g., just an address or short text), making their intent unclear.\n\n"
                    "Reply with ONLY one word: 'translation', 'claim_filing', 'consultation', or 'ambiguous'."
                )
                resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=message)])
                candidate = resp.content.strip().lower()
                if candidate in ["translation", "claim_filing", "consultation", "ambiguous"]:
                    intent = candidate
            except Exception as e:
                logger.warning(f"LLM intent classification failed: {e}")
        else:
            # Fallback keyword logic
            is_address_like = any(x in message for x in ["市", "区", "路", "街", "号", "室"]) and len(message) < 50
            if is_address_like and not any(kw in message for kw in ["翻译", "译", "translate"]):
                intent = "ambiguous"
            elif any(kw in message for kw in self._CLAIM_KEYWORDS_ZH):
                intent = "claim_filing"
            elif any(kw in msg_lower for kw in self._CLAIM_KEYWORDS_EN):
                intent = "claim_filing"
            
        if not is_filing_allowed and intent == "claim_filing":
            return "consultation"
            
        return intent


    async def process_message(
        self,
        message: str,
        history: List[Dict[str, str]],
        collected_data: Dict,
        session_state: Dict,
        dynamic_keys: Optional[Dict[str, str]] = None,
        is_filing_allowed: bool = True,
        claim_id: Optional[str] = None
    ) -> Dict:
        """
        Main entry point for each conversational turn. Supports dynamic intent switching.
        """
        # Detect intent for the current turn dynamically to allow translation and switching
        existing_intent = session_state.get("intent")
        current_intent = await self.detect_intent(message, history, dynamic_keys, existing_intent, is_filing_allowed)
        
        # Route to handler
        if current_intent == "translation":
            return await self._handle_translation(message, dynamic_keys)
        elif current_intent == "consultation":
            return await self._handle_consultation(message, dynamic_keys, claim_id)
        elif current_intent == "ambiguous":
            return await self._handle_ambiguous(message)

        # For claim_filing: keep track of filing state
        if session_state.get("intent") != "claim_filing":
            session_state["intent"] = "claim_filing"
            session_state["step"] = 1
        else:
            session_state["step"] = session_state.get("step", 0) + 1

        return await self._handle_claim_filing(message, history, collected_data, session_state, dynamic_keys)

    async def _handle_ambiguous(self, message: str) -> Dict:
        """
        Handle ambiguous input by asking the user to clarify their intent.
        """
        reply = (
            "您输入的内容看起来是一个地址或短语。请问您是想将其翻译成英文，还是需要查询与该地址相关的理赔案件/保单？\n\n"
            "It seems you entered an address or phrase. Would you like to translate it, or are you looking for claims/policies associated with it?"
        )
        return {
            "reply": reply,
            "collected_data": {},
            "session_state": {"intent": "ambiguous"},
            "is_complete": False,
            "next_question": None,
        }

    # ------------------------------------------------------------------
    # Translation handler
    # ------------------------------------------------------------------

    async def _handle_translation(self, message: str, dynamic_keys: Optional[Dict[str, str]] = None) -> Dict:
        """
        Translate the user's text into English (if Chinese) or Chinese (if English).
        """
        try:
            from app.services.ai.llm_factory import get_llm
            llm, provider = get_llm(dynamic_keys=dynamic_keys)
            system = (
                "You are an expert bilingual translator working in an insurance environment.\n"
                "Translate the user's input text.\n"
                "- If the input is primarily in Chinese, translate it to clear, professional English.\n"
                "- If the input is in English or other languages, translate it to natural, professional Chinese.\n"
                "Output ONLY the translated text without any conversational preamble or quotes."
            )
            resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=message)])
            reply = f"【AI 翻译 / Translation】\n{resp.content.strip()}"
        except Exception as e:
            reply = f"Translation failed: {str(e)}"

        return {
            "reply": reply,
            "collected_data": {},
            "session_state": {"intent": "translation"},
            "is_complete": False,
            "next_question": None,
        }

    # ------------------------------------------------------------------
    # Consultation handler
    # ------------------------------------------------------------------

    async def _handle_consultation(
        self,
        message: str,
        dynamic_keys: Optional[Dict[str, str]] = None,
        claim_id: Optional[str] = None
    ) -> Dict:
        """
        Retrieve relevant policy knowledge via RAG and synthesise an intelligent reply.
        Supports boundary disclosure if no RAG context exists.
        """
        from app.services.ai.rag import RAGService
        from app.services.ai.llm_factory import get_llm
        import os
        from app.core.config import settings

        # Query active claim context if available
        claim_context = ""
        rag_query = message
        if claim_id:
            from app.utils.database import SessionLocal
            from app.models.claim import Claim
            import uuid
            db = SessionLocal()
            try:
                claim_uuid = uuid.UUID(str(claim_id))
                claim = db.query(Claim).filter(Claim.id == claim_uuid).first()
                if claim:
                    docs_info = []
                    for doc in claim.documents:
                        doc_type_val = doc.doc_type.value if hasattr(doc.doc_type, 'value') else doc.doc_type
                        docs_info.append(f"- {doc_type_val} (File: {doc.file_name})")
                    
                    claim_type_val = claim.claim_type.value if hasattr(claim.claim_type, 'value') else claim.claim_type
                    claim_status_val = claim.status.value if hasattr(claim.status, 'value') else claim.status
                    
                    claim_context = (
                        "=== Current Active Claim Details (Active on Screen) ===\n"
                        f"Claim Number: {claim.claim_number}\n"
                        f"Policy Number: {claim.policy_number}\n"
                        f"Claim Type: {claim_type_val}\n"
                        f"Status: {claim_status_val}\n"
                        f"Incident Date: {claim.incident_date}\n"
                        f"Incident Location: {claim.incident_location}\n"
                        f"Incident Description: {claim.incident_description}\n"
                        f"Claimed Amount: {claim.claimed_amount}\n"
                        f"AI Decision: {claim.ai_decision}\n"
                        f"AI Confidence: {claim.ai_confidence}\n"
                        f"AI Reasoning: {claim.ai_reasoning}\n"
                        f"Adjuster Notes: {claim.adjuster_notes}\n"
                        "Uploaded Documents:\n" + ("\n".join(docs_info) if docs_info else "No documents uploaded.") + "\n\n"
                    )
                    # Enrich search query with active claim details to pull the correct document vector chunks
                    rag_query = f"{claim_type_val} {claim.incident_description or ''} {message}".strip()
            except Exception as e:
                logger.error(f"[Dialog] Failed to query claim details for context: {e}")
            finally:
                db.close()

        rag_service = RAGService()
        docs = await rag_service.search(rag_query, top_k=3, dynamic_keys=dynamic_keys)
        is_en = _is_english(message)

        context_snippets = ""
        if docs:
            context_snippets = "\n".join(
                f"[{d['source']}] {d['text']}" for d in docs
            )

        # Import few-shot examples dynamically to prevent boot-time circular dependencies or missing-file errors
        few_shot_examples_text = ""
        try:
            from data.few_shot_examples import FEW_SHOT_EXAMPLES
            if FEW_SHOT_EXAMPLES:
                few_shot_examples_text = "=== Few-Shot Examples (Examples of exact format and correct citations) ===\n"
                for i, ex in enumerate(FEW_SHOT_EXAMPLES):
                    few_shot_examples_text += f"Example {i+1}:\nUser Question: {ex['user']}\nStandard Citation Response: {ex['assistant']}\n\n"
        except ImportError:
            pass

        reply = None
        has_keys = (dynamic_keys or {}).get("GEMINI_API_KEY") or (dynamic_keys or {}).get("ANTHROPIC_API_KEY") or settings.GEMINI_API_KEY or settings.ANTHROPIC_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
        
        if has_keys:
            try:
                llm, provider = get_llm(dynamic_keys=dynamic_keys, enable_search=True)
                
                system = (
                    "You are an intelligent Insurance Claims & Policy Consultation Expert Chatbot.\n"
                    "Your task is to answer the user's question about insurance policies, rules, procedures, and the active claim case details.\n\n"
                    f"{claim_context}"
                    "=== Policy Knowledge Context (RAG-Retrieved) ===\n"
                    f"{context_snippets if context_snippets else 'No official policy matches found in the RAG database.'}\n\n"
                    f"{few_shot_examples_text}"
                    "=== Hard Constraints ===\n"
                    "1. If the retrieved context contains the answer, base your answer on it and explicitly cite the source document name (e.g. [Claims Manual v3.2]).\n"
                    "2. If the retrieved context does NOT contain the answer, you MAY use your general knowledge and search capability to answer. However, you MUST precede your answer with a highly visible warning statement disclosing the limitation boundary:\n"
                    "   - In Chinese: '【无官方条款引用提示】本回答在官方保险条款中未找到直接参考依据。以下内容基于通用知识或联网搜索解答，不代表本保险合同的官方条款。'\n"
                    "   - In English: '[No Policy Reference Warning] This response is not covered by the official policy database. The following is based on general knowledge or web search and does not represent official policy terms.'\n"
                    "3. Write your answer in the same language as the user's question."
                )
                
                resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=message)])
                reply = resp.content.strip()
            except Exception as e:
                logger.error(f"Failed to generate consultation response: {e}")

        # Fallback formatting if LLM fails, is offline, or is not configured (e.g., during unit tests)
        if not reply:
            if docs:
                if is_en:
                    reply = (
                        "[Knowledge Base Answer]\n"
                        f"Based on the policy documents:\n{context_snippets}\n\n"
                        "If you need to file a claim, just say 'I want to file a claim'."
                    )
                else:
                    reply = (
                        "【知识库解答】\n"
                        f"根据保险条款：\n{context_snippets}\n\n"
                        "如果您需要发起理赔，请告诉我「我要理赔」。"
                    )
            else:
                if is_en:
                    reply = (
                        "I couldn't find specific information about that in our policy database. "
                        "Would you like to file a claim directly? Just say 'I want to file a claim'."
                    )
                else:
                    reply = (
                        "抱歉，暂时未在条款中找到相关内容。"
                        "请问您需要直接发起理赔报案吗？"
                    )

        return {
            "reply": reply,
            "collected_data": {},
            "session_state": {"intent": "consultation"},
            "is_complete": False,
            "next_question": None,
        }

    # ------------------------------------------------------------------
    # Claim filing handler — LLM-driven slot extraction
    # ------------------------------------------------------------------

    async def _handle_claim_filing(
        self,
        message: str,
        history: List[Dict[str, str]],
        collected_data: Dict,
        session_state: Dict,
        dynamic_keys: Optional[Dict[str, str]] = None,
    ) -> Dict:
        """
        Dynamically extract claim fields from the user's message using a
        structured-output LLM call.  The model reads history + already-collected
        data and returns an updated slot dictionary plus its next reply.
        """
        schema_description = ClaimIntakeSchema.model_json_schema()
        is_en = _is_english(message)

        # Build conversation history context (last 6 turns to keep token cost low)
        history_text = "\n".join(
            f"{turn['role'].upper()}: {turn['content']}"
            for turn in history[-6:]
        ) if history else "(no prior history)"

        lang_instruction = (
            "Reply in English — the user is writing in English."
            if is_en else
            "使用中文回复 — 用户正在使用中文对话。"
        )

        system_prompt = f"""\
You are an empathetic, professional insurance claims intake assistant.
Your task: collect all six required fields through natural conversation.

=== Required Fields (JSON Schema) ===
{json.dumps(schema_description, ensure_ascii=False, indent=2)}

=== Already Collected ===
{json.dumps(collected_data, ensure_ascii=False, indent=2)}

=== Conversation History ===
{history_text}

=== Instructions ===
1. Parse the USER's latest message to extract any newly provided field values.
2. Merge them with the already-collected data — do NOT discard previously filled fields.
3. If any required fields are still null / empty:
   - Ask naturally for ONE missing field at a time.
   - Do NOT list all missing fields at once.
4. If ALL six fields are filled, set is_complete=true and ask the user to upload
   supporting documents (receipts, photos, etc.).
5. {lang_instruction}
6. Never make up data that the user has not provided.
7. Output ONLY valid JSON matching the DialogResponseSchema — no extra prose.
"""

        human_content = f"USER's latest message: {message}"

        try:
            llm, provider = get_structured_llm(DialogResponseSchema, self.model, dynamic_keys)
            logger.debug(f"[Dialog] Invoking slot-extraction LLM via provider={provider}")

            response: DialogResponseSchema = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content),
            ])

            new_collected = response.updated_data
            is_complete = response.is_complete
            reply = response.reply

        except Exception as exc:
            logger.error(f"[Dialog] LLM slot extraction failed: {exc}", exc_info=True)
            # Graceful degradation: preserve existing data, ask for first missing field
            new_collected = dict(collected_data)
            fields = list(ClaimIntakeSchema.model_fields.keys())
            missing = [f for f in fields if not new_collected.get(f)]
            is_complete = len(missing) == 0
            if is_complete:
                reply = "审核信息收集完毕，请上传相关凭证。" if not is_en else "All information collected. Please upload your supporting documents."
            else:
                field_map = {
                    "claim_type": "理赔类型 (e.g. 医疗险/车险)",
                    "incident_date": "出险日期",
                    "incident_location": "出险地点",
                    "incident_description": "事故描述",
                    "claimed_amount": "预估金额",
                    "upload_receipts": "凭证上传情况",
                }
                next_field = field_map.get(missing[0], missing[0])
                reply = f"请提供：{next_field}" if not is_en else f"Could you please provide: {missing[0]}?"

        if is_complete:
            session_state["ready_for_upload"] = True

        return {
            "reply": reply,
            "collected_data": new_collected,
            "session_state": session_state,
            "is_complete": is_complete,
            "next_question": reply if not is_complete else None,
        }
