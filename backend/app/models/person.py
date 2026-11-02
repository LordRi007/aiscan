from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    person_code = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), default="Anonymous")
    registration_image_path = Column(String(256), nullable=False)
    registration_status = Column(String(64), default="verified_new")
    consent_status = Column(String(64), default="consented")
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    embeddings = relationship("FaceEmbedding", back_populates="person", cascade="all, delete-orphan")
    sessions = relationship("FaceSession", back_populates="person", cascade="all, delete-orphan")
    expressions = relationship("ExpressionObservation", back_populates="person", cascade="all, delete-orphan")
