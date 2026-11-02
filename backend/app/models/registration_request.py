from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base

class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(Integer, primary_key=True, index=True)
    tracking_session_id = Column(Integer, nullable=True)
    candidate_person_id = Column(Integer, nullable=True)
    registration_status = Column(String(64), default="pending") # pending, approved, rejected, completed
    consent_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
