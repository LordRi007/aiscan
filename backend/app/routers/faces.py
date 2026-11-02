import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.person import Person
from app.models.face_session import FaceSession
from app.models.expression_observation import ExpressionObservation
from app.models.verification_event import VerificationEvent
from app.services.face_detector import face_detector
from app.services.face_recognition import face_recognition_engine
from app.services.face_verification import face_verification_engine
from app.services.registration_manager import registration_manager

router = APIRouter(prefix="/faces", tags=["Faces"])

class ConsentUpdateRequest(BaseModel):
    consent_status: str # 'consented', 'exempt', 'revoked'

class ManualRegisterRequest(BaseModel):
    image_base64: str
    name: Optional[str] = None
    consent_status: str = "consented"

@router.get("/registered")
def get_registered_faces(
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve list of all registered individuals with search and pagination."""
    query = db.query(Person)
    if search:
        query = query.filter(
            (Person.name.ilike(f"%{search}%")) | (Person.person_code.ilike(f"%{search}%"))
        )
    
    total = query.count()
    persons = query.order_by(Person.registered_at.desc()).offset(offset).limit(limit).all()

    items = []
    for p in persons:
        # Get latest expression
        latest_expr = (
            db.query(ExpressionObservation)
            .filter(ExpressionObservation.person_id == p.id)
            .order_by(ExpressionObservation.observed_at.desc())
            .first()
        )
        items.append({
            "id": p.id,
            "person_code": p.person_code,
            "name": p.name,
            "registration_image_path": p.registration_image_path,
            "registration_status": p.registration_status,
            "consent_status": p.consent_status,
            "registered_at": p.registered_at.isoformat() if p.registered_at else None,
            "last_seen_at": p.last_seen_at.isoformat() if p.last_seen_at else None,
            "latest_expression": latest_expr.expression_category if latest_expr else "Neutral",
            "expression_confidence": latest_expr.model_confidence if latest_expr else 0.0
        })

    return {
        "total": total,
        "items": items
    }

@router.get("/{person_id}")
def get_person_details(person_id: int, db: Session = Depends(get_db)):
    """Retrieve full detail profile of a registered individual."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Fetch recognition sessions
    sessions = (
        db.query(FaceSession)
        .filter(FaceSession.person_id == person.id)
        .order_by(FaceSession.matched_at.desc())
        .limit(20)
        .all()
    )

    # Fetch recent expression observations
    expressions = (
        db.query(ExpressionObservation)
        .filter(ExpressionObservation.person_id == person.id)
        .order_by(ExpressionObservation.observed_at.desc())
        .limit(20)
        .all()
    )

    return {
        "person": {
            "id": person.id,
            "person_code": person.person_code,
            "name": person.name,
            "registration_image_path": person.registration_image_path,
            "registration_status": person.registration_status,
            "consent_status": person.consent_status,
            "registered_at": person.registered_at.isoformat() if person.registered_at else None,
            "last_seen_at": person.last_seen_at.isoformat() if person.last_seen_at else None,
        },
        "sessions": [
            {
                "id": s.id,
                "tracking_id": s.tracking_id,
                "recognition_status": s.recognition_status,
                "confidence": s.confidence,
                "matched_at": s.matched_at.isoformat() if s.matched_at else None
            }
            for s in sessions
        ],
        "expressions": [
            {
                "id": e.id,
                "category": e.expression_category,
                "confidence": e.model_confidence,
                "observed_at": e.observed_at.isoformat() if e.observed_at else None
            }
            for e in expressions
        ]
    }

@router.delete("/{person_id}")
def delete_person_record(person_id: int, db: Session = Depends(get_db)):
    """GDPR compliant permanent biometric deletion."""
    success = registration_manager.delete_person(db, person_id)
    if not success:
        raise HTTPException(status_code=404, detail="Person not found or delete failed")
    # Refresh cache
    face_verification_engine.get_registered_embeddings(db, force_refresh=True)
    return {"status": "success", "message": f"Biometric records for person {person_id} permanently deleted."}

@router.post("/{person_id}/consent")
def update_consent(person_id: int, req: ConsentUpdateRequest, db: Session = Depends(get_db)):
    """Update biometric consent status."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    person.consent_status = req.consent_status
    db.commit()
    return {"status": "success", "consent_status": person.consent_status}

@router.post("/check-existing")
def check_existing_identity(req: ManualRegisterRequest, db: Session = Depends(get_db)):
    """
    Check if a candidate image matches any existing registered identity before registering.
    """
    try:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        detected = face_detector.detect_faces(frame)
        if not detected:
            return {"has_face": False, "message": "No face detected in provided image"}

        best_face = detected[0]
        emb = face_recognition_engine.extract_embedding(best_face.face_img, best_face.landmarks)
        registered = face_verification_engine.get_registered_embeddings(db)
        match_res = face_recognition_engine.search_candidates(emb, registered)

        return {
            "has_face": True,
            "decision": match_res["decision"],
            "best_match": match_res["best_match"],
            "similarity": match_res["similarity"],
            "quality": best_face.quality
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
