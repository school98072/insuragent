from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.claim import ClaimStatus, ClaimType


class ClaimCreate(BaseModel):
    policy_number: str
    claim_type: ClaimType
    incident_date: datetime
    incident_location: Optional[str] = None
    incident_description: Optional[str] = None
    claimed_amount: Optional[float] = None


class ClaimUpdate(BaseModel):
    incident_location: Optional[str] = None
    incident_description: Optional[str] = None
    claimed_amount: Optional[float] = None
    status: Optional[ClaimStatus] = None
    adjuster_notes: Optional[str] = None
    approved_amount: Optional[float] = None


class ClaimDocumentResponse(BaseModel):
    id: UUID
    claim_id: UUID
    doc_type: str
    file_name: str
    file_size: Optional[float]
    mime_type: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClaimResponse(BaseModel):
    id: UUID
    claim_number: str
    policy_number: str
    claim_type: ClaimType
    status: ClaimStatus
    incident_date: datetime
    incident_location: Optional[str]
    incident_description: Optional[str]
    claimed_amount: Optional[float]
    approved_amount: Optional[float]
    ai_decision: Optional[str]
    ai_confidence: Optional[float]
    ai_reasoning: Optional[str]
    adjuster_notes: Optional[str] = None
    ai_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    documents: List[ClaimDocumentResponse] = []

    model_config = {"from_attributes": True}


class ClaimListResponse(BaseModel):
    items: List[ClaimResponse]
    total: int
    page: int
    page_size: int
