from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base

class VerificationEvent(Base):
    __tablename__ = "verification_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=True)
    candidate_person_id = Column(Integer, nullable=True)
    similarity_score = Column(Float, default=0.0)
    verification_result = Column(String(64), nullable=False) # match, no_match, ambiguous, approved, rejected
    reviewed_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
