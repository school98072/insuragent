import sys
import os
import uuid
from typing import Optional, Dict

# Ensure app package is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

from app.utils.database import SessionLocal
from app.models.claim import Claim, ClaimStatus
from app.services.ai.agents import ClaimsAIOrchestrator
from app.services.ai.ocr import OCRService

# Initialize FastMCP Server
mcp = FastMCP("Insurance Claims AI MCP Server")

@mcp.tool()
async def claims_chat(
    message: str,
    user_id: str,
    claim_id: Optional[str] = None,
    session_id: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    anthropic_api_key: Optional[str] = None,
) -> str:
    """
    Interact with the stateful Claims Chat Dialog Engine.
    
    Args:
        message: User input query/message.
        user_id: ID of the user starting the session.
        claim_id: Optional ID of the claim context.
        session_id: Optional Session identifier for dialog memory.
        gemini_api_key: Optional private GEMINI_API_KEY.
        anthropic_api_key: Optional private ANTHROPIC_API_KEY.
    """
    dynamic_keys = {}
    if gemini_api_key:
        dynamic_keys["GEMINI_API_KEY"] = str(gemini_api_key).strip()
    if anthropic_api_key:
        dynamic_keys["ANTHROPIC_API_KEY"] = str(anthropic_api_key).strip()
        
    orchestrator = ClaimsAIOrchestrator()
    response = await orchestrator.chat(
        message=message,
        user_id=user_id,
        claim_id=claim_id,
        session_id=session_id,
        dynamic_keys=dynamic_keys if dynamic_keys else None
    )
    return response

@mcp.tool()
async def analyze_claim(
    claim_id: str,
    gemini_api_key: Optional[str] = None,
    anthropic_api_key: Optional[str] = None,
) -> str:
    """
    Run the end-to-end multi-agent evaluation pipeline (RAG, OCR, Damage Assessment, Policy Coverage, and Decision Agents)
    on a claim, dynamically passing private API keys.
    
    Args:
        claim_id: The UUID of the claim to analyze.
        gemini_api_key: Optional private GEMINI_API_KEY to bypass server keys.
        anthropic_api_key: Optional private ANTHROPIC_API_KEY to bypass server keys.
    """
    db = SessionLocal()
    dynamic_keys = {}
    if gemini_api_key:
        dynamic_keys["GEMINI_API_KEY"] = str(gemini_api_key).strip()
    if anthropic_api_key:
        dynamic_keys["ANTHROPIC_API_KEY"] = str(anthropic_api_key).strip()

    try:
        claim_uuid = uuid.UUID(claim_id)
        claim = db.query(Claim).filter(Claim.id == claim_uuid).first()
        if not claim:
            return f"Error: Claim {claim_id} not found."

        claim.status = ClaimStatus.ai_processing
        db.commit()

        # 1. OCR all documents
        ocr_service = OCRService()
        ocr_data = {}
        for doc in claim.documents:
            res = await ocr_service.extract_text(doc.file_name, dynamic_keys=dynamic_keys if dynamic_keys else None)
            ocr_data[doc.file_name] = res

        # 2. Run AI Orchestrator
        orchestrator = ClaimsAIOrchestrator()
        result = await orchestrator.analyze_claim(claim, db, ocr_data, dynamic_keys=dynamic_keys if dynamic_keys else None)

        # 3. Update claim with decision
        claim.ai_decision = result.get("decision")
        claim.ai_confidence = result.get("confidence")
        claim.ai_reasoning = result.get("reasoning")
        claim.ai_metadata = result.get("metadata")
        claim.approved_amount = result.get("recommended_amount")

        from datetime import datetime
        if claim.ai_decision == "approve":
            claim.status = ClaimStatus.approved
            claim.resolved_at = datetime.utcnow()
        elif claim.ai_decision == "reject":
            claim.status = ClaimStatus.rejected
            claim.resolved_at = datetime.utcnow()
        else:
            claim.status = ClaimStatus.human_review

        db.commit()
        db.refresh(claim)

        import json
        return json.dumps({
            "claim_id": str(claim.id),
            "status": claim.status.value,
            "decision": claim.ai_decision,
            "confidence": claim.ai_confidence,
            "recommended_amount": claim.approved_amount,
            "reasoning": claim.ai_reasoning,
            "citations": claim.ai_metadata.get("policy_coverage", {}).get("citations", []) if claim.ai_metadata else []
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        db.rollback()
        import traceback
        err_msg = f"AI processing failed: {str(e)}\n{traceback.format_exc()}"
        claim.status = ClaimStatus.human_review
        claim.ai_reasoning = err_msg
        db.commit()
        return f"Error executing claim analysis: {err_msg}"
    finally:
        db.close()

if __name__ == "__main__":
    mcp.run(transport="stdio")
