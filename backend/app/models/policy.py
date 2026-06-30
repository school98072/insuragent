from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Float, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.utils.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_number = Column(String(50), unique=True, nullable=False, index=True)
    holder_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    broker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    policy_type = Column(String(50), nullable=False)
    insurer_name = Column(String(255), nullable=False)
    premium = Column(Float)
    coverage_amount = Column(Float)
    deductible = Column(Float)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    coverage_details = Column(JSON)
    exclusions = Column(Text)
    terms_document_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    holder = relationship("User", foreign_keys=[holder_id])
    broker = relationship("User", foreign_keys=[broker_id])
