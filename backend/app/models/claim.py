from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from app.utils.database import Base


class ClaimStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    ai_processing = "ai_processing"
    human_review = "human_review"
    approved = "approved"
    rejected = "rejected"
    closed = "closed"


class ClaimType(str, enum.Enum):
    auto = "auto"
    health = "health"
    property = "property"
    life = "life"


class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_number = Column(String(50), unique=True, nullable=False, index=True)
    policy_number = Column(String(50), nullable=False, index=True)
    claimant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    broker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    claim_type = Column(Enum(ClaimType), nullable=False)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.draft, nullable=False)
    incident_date = Column(DateTime, nullable=False)
    incident_location = Column(String(500))
    incident_description = Column(Text)
    claimed_amount = Column(Float)
    approved_amount = Column(Float)
    ai_decision = Column(String(50))
    ai_confidence = Column(Float)
    ai_reasoning = Column(Text)
    ai_metadata = Column(JSON)
    adjuster_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    adjuster_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime)
    resolved_at = Column(DateTime)

    claimant = relationship("User", foreign_keys=[claimant_id])
    broker = relationship("User", foreign_keys=[broker_id])
    adjuster = relationship("User", foreign_keys=[adjuster_id])
    documents = relationship("ClaimDocument", back_populates="claim")


class ClaimDocument(Base):
    __tablename__ = "claim_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    doc_type = Column(String(100), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Float)
    mime_type = Column(String(100))
    ocr_text = Column(Text)
    ocr_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="documents")
