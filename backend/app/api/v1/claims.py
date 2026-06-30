from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime
from app.utils.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.claim import Claim, ClaimDocument, ClaimStatus
from app.schemas.claim import ClaimCreate, ClaimUpdate, ClaimResponse, ClaimListResponse
from app.schemas.response import SuccessResponse

router = APIRouter(prefix="/claims", tags=["claims"])


def generate_claim_number() -> str:
    return f"CLM-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"


@router.post("", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def create_claim(
    data: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    claim = Claim(
        claim_number=generate_claim_number(),
        claimant_id=current_user.id,
        broker_id=current_user.id if current_user.role == UserRole.ROLE_BROKER else None,
        **data.model_dump(),
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


@router.get("", response_model=ClaimListResponse)
def list_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ClaimStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    query = db.query(Claim)
    from app.models.user import UserRole
    if current_user.role == UserRole.ROLE_BROKER:
        query = query.filter(Claim.broker_id == current_user.id)
    if status:
        query = query.filter(Claim.status == status)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ClaimListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(
    claim_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    from app.models.user import UserRole
    if current_user.role == UserRole.ROLE_BROKER and claim.broker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Self-healing: if claim has been in ai_processing for more than 3 minutes, it is stale. Reset it.
    if claim.status == ClaimStatus.ai_processing:
        import datetime as dt
        now = dt.datetime.utcnow()
        if claim.updated_at and (now - claim.updated_at) > dt.timedelta(minutes=3):
            claim.status = ClaimStatus.submitted
            claim.ai_reasoning = "AI Analysis was interrupted or timed out. Please click 'Run Pre-approval' or 'Run AI Analysis' to try again."
            db.commit()
            db.refresh(claim)
            
    return claim


@router.patch("/{claim_id}", response_model=ClaimResponse)
def update_claim(
    claim_id: uuid.UUID,
    data: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(claim, field, value)
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/submit", response_model=ClaimResponse)
def submit_claim(
    claim_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER)),
):
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.broker_id == current_user.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != ClaimStatus.draft:
        raise HTTPException(status_code=400, detail="Claim already submitted")
    claim.status = ClaimStatus.submitted
    claim.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/{claim_id}/documents", response_model=SuccessResponse)
async def upload_document(
    claim_id: uuid.UUID,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    import os
    from app.core.config import settings
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = f"{settings.UPLOAD_DIR}/{claim_id}/{file.filename}"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    doc = ClaimDocument(
        claim_id=claim_id,
        doc_type=doc_type,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
    )
    db.add(doc)
    db.commit()
    return SuccessResponse(message="Document uploaded successfully")


from pydantic import BaseModel
from typing import Dict, Optional

class ClaimsAnalyzeRequest(BaseModel):
    dynamic_keys: Optional[Dict[str, str]] = None


@router.post("/{claim_id}/analyze", response_model=ClaimResponse)
async def analyze_claim(
    claim_id: uuid.UUID,
    request_data: Optional[ClaimsAnalyzeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ROLE_BROKER, UserRole.ROLE_ADJUSTER, UserRole.ROLE_ADMIN)),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    original_status = claim.status.value if claim.status else ClaimStatus.submitted
    claim.status = ClaimStatus.ai_processing
    db.commit()
    
    try:
        from app.services.ai.ocr import OCRService
        from app.services.ai.agents import ClaimsAIOrchestrator
        
        dynamic_keys = request_data.dynamic_keys if request_data else None

        # 1. OCR all documents
        ocr_service = OCRService()
        ocr_data = {}
        for doc in claim.documents:
            # Note: in real prod, we'd process actual file. We pass filename to mock logic.
            res = await ocr_service.extract_text(doc.file_name, dynamic_keys=dynamic_keys)
            ocr_data[doc.file_name] = res
            
        # 2. Run AI Orchestrator
        orchestrator = ClaimsAIOrchestrator()
        result = await orchestrator.analyze_claim(claim, db, ocr_data, dynamic_keys=dynamic_keys)
        
        # 3. Update claim with decision
        claim.ai_decision = result.get("decision")
        claim.ai_confidence = result.get("confidence")
        claim.ai_reasoning = result.get("reasoning")
        claim.ai_metadata = result.get("metadata")
        claim.approved_amount = result.get("recommended_amount")
        
        user_role_str = str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role)
        if user_role_str == "ROLE_BROKER":
            claim.status = original_status
        else:
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
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        claim.status = original_status if original_status != "ai_processing" else ClaimStatus.submitted
        claim.ai_reasoning = f"AI processing failed: {str(e)}"
        db.commit()
        db.refresh(claim)
        
    return claim
