from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ExpressionObservation(Base):
    __tablename__ = "expression_observations"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(Integer, ForeignKey("face_sessions.id", ondelete="SET NULL"), nullable=True)
    expression_category = Column(String(64), nullable=False)
    model_confidence = Column(Float, default=0.0)
    observed_at = Column(DateTime, default=datetime.utcnow, index=True)

    person = relationship("Person", back_populates="expressions")
