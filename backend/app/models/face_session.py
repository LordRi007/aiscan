from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FaceSession(Base):
    __tablename__ = "face_sessions"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=True)
    camera_id = Column(Integer, nullable=True)
    tracking_id = Column(Integer, nullable=False, index=True)
    matched_at = Column(DateTime, default=datetime.utcnow)
    recognition_status = Column(String(64), default="unmatched")
    confidence = Column(Float, default=0.0)
    ended_at = Column(DateTime, nullable=True)

    person = relationship("Person", back_populates="sessions")
