from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
from app.utils.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.claim import Claim, ClaimStatus
from app.services.ai.agents import ClaimsAIOrchestrator
from pydantic import BaseModel
from typing import Optional, Dict

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    message: str
    claim_id: Optional[str] = None
    session_id: Optional[str] = None
    dynamic_keys: Optional[Dict[str, str]] = None


class AIAnalysisRequest(BaseModel):
    claim_id: str
    dynamic_keys: Optional[Dict[str, str]] = None


@router.post("/chat")
async def chat(
    request: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orchestrator = ClaimsAIOrchestrator()
    response = await orchestrator.chat(
        message=request.message,
        user_id=str(current_user.id),
        claim_id=request.claim_id,
        session_id=request.session_id,
        dynamic_keys=request.dynamic_keys,
    )
    return {"response": response, "session_id": request.session_id or str(uuid.uuid4())}


@router.post("/analyze/{claim_id}")
async def analyze_claim(
    claim_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    request_data: Optional[AIAnalysisRequest] = None,
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    original_status = claim.status.value if claim.status else ClaimStatus.submitted
    claim.status = ClaimStatus.ai_processing
    db.commit()

    dynamic_keys = request_data.dynamic_keys if request_data else None
    user_role_str = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
    
    background_tasks.add_task(
        _run_ai_analysis,
        claim_id=str(claim_id),
        user_role=user_role_str,
        original_status=original_status,
        dynamic_keys=dynamic_keys
    )
    return {"message": "AI analysis started", "claim_id": str(claim_id)}


async def _run_ai_analysis(
    claim_id: str,
    user_role: str,
    original_status: str,
    dynamic_keys: Optional[Dict[str, str]] = None
):
    from app.utils.database import SessionLocal
    db = SessionLocal()
    import logging
    import uuid
    logger = logging.getLogger(__name__)
    logger.info(f"Starting AI analysis for claim {claim_id} for role {user_role} with dynamic keys: {bool(dynamic_keys)}")
    try:
        claim_uuid = uuid.UUID(claim_id)
        claim = db.query(Claim).filter(Claim.id == claim_uuid).first()
        if not claim:
            logger.error(f"Claim not found: {claim_id}")
            return
        orchestrator = ClaimsAIOrchestrator()
        result = await orchestrator.analyze_claim(claim, db, dynamic_keys=dynamic_keys)
        
        claim.ai_decision = result.get("decision")
        claim.ai_confidence = result.get("confidence")
        claim.ai_reasoning = result.get("reasoning")
        claim.ai_metadata = result.get("metadata")
        claim.approved_amount = result.get("recommended_amount") or 0.0
        
        if user_role == "ROLE_BROKER":
            # Broker perspective: pre-approval only. Maintain/restore the original status.
            claim.status = original_status
        else:
            # Adjuster perspective: auto-approve / reject / human-in-the-loop
            decision = result.get("decision")
            if decision == "approve":
                claim.status = ClaimStatus.approved
            elif decision == "reject":
                claim.status = ClaimStatus.rejected
            else:
                claim.status = ClaimStatus.human_review
        db.commit()
        logger.info(f"AI analysis completed for claim {claim_id}, status: {claim.status}")
    except Exception as e:
        logger.error(f"Error in _run_ai_analysis: {e}", exc_info=True)
        try:
            # Clean reload state and show error message
            db_conn = SessionLocal()
            claim_uuid = uuid.UUID(claim_id)
            claim_retry = db_conn.query(Claim).filter(Claim.id == claim_uuid).first()
            if claim_retry:
                claim_retry.status = original_status if original_status != "ai_processing" else ClaimStatus.submitted
                claim_retry.ai_reasoning = f"AI Analysis failed: {str(e)}\n\nPlease check your local API keys and try again."
                db_conn.commit()
            db_conn.close()
        except Exception as db_err:
            logger.error(f"Failed to reset claim status on error: {db_err}")
    finally:
        db.close()


@router.get("/knowledge/search")
async def search_knowledge(
    query: str,
    top_k: int = 5,
    gemini_api_key: Optional[str] = None,
    anthropic_api_key: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    from app.services.ai.rag import RAGService
    rag = RAGService()
    
    dynamic_keys = {}
    if gemini_api_key:
        dynamic_keys["GEMINI_API_KEY"] = gemini_api_key
    if anthropic_api_key:
        dynamic_keys["ANTHROPIC_API_KEY"] = anthropic_api_key
        
    results = await rag.search(query=query, top_k=top_k, dynamic_keys=dynamic_keys if dynamic_keys else None)
    return {"results": results}
