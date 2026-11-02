from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from app.database import Base

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    encrypted_embedding = Column(LargeBinary, nullable=False)
    model_name = Column(String(64), default="FaceNet-Standard")
    model_version = Column(String(32), default="v1.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    person = relationship("Person", back_populates="embeddings")
