import cv2
import threading
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app.config import settings, encrypt_embedding
from app.models.person import Person
from app.models.face_embedding import FaceEmbedding
from app.models.face_session import FaceSession
from app.models.expression_observation import ExpressionObservation
from app.models.verification_event import VerificationEvent

logger = logging.getLogger("registration_manager")

class RegistrationManager:
    """
    Transaction-Safe Biometric Face Registration Manager.
    - Prevents race conditions with global registration lock.
    - Generates sequential person codes (FACE-000001).
    - Encrypts embeddings before persisting.
    - Stores high-quality aligned registration snapshots in protected storage.
    """
    def __init__(self):
        self._reg_lock = threading.Lock()

    def generate_next_person_code(self, db: Session) -> str:
        """Query highest person id and generate next sequential code FACE-XXXXXX."""
        last_person = db.query(Person).order_by(Person.id.desc()).first()
        next_num = (last_person.id + 1) if last_person else 1
        return f"FACE-{next_num:06d}"

    def register_new_person(
        self,
        db: Session,
        snapshot_img: np.ndarray,
        embedding: np.ndarray,
        initial_expression: str = "Neutral",
        expression_confidence: float = 75.0,
        name: Optional[str] = None,
        consent_status: str = "consented",
        camera_id: Optional[int] = None,
        tracking_id: int = 0
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Execute atomical registration of a verified new individual.
        Requires global lock to eliminate simultaneous duplicate insertion.
        """
        with self._reg_lock:
            try:
                # 1. Generate unique code
                person_code = self.generate_next_person_code(db)
                filename = f"{person_code}.jpg"
                filepath = settings.protected_storage_dir / filename

                # 2. Save protected snapshot
                if snapshot_img is None or snapshot_img.size == 0:
                    return False, None, "Invalid snapshot image"

                success = cv2.imwrite(str(filepath), snapshot_img)
                if not success:
                    return False, None, "Failed to write snapshot to disk"

                # 3. Create Person record
                person = Person(
                    person_code=person_code,
                    name=name if name else f"Person {person_code}",
                    registration_image_path=f"/protected/faces/{filename}",
                    registration_status="verified_new",
                    consent_status=consent_status,
                    registered_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow()
                )
                db.add(person)
                db.flush() # Get person.id

                # 4. Encrypt and store embedding
                raw_bytes = embedding.astype(np.float32).tobytes()
                encrypted = encrypt_embedding(raw_bytes)

                face_emb = FaceEmbedding(
                    person_id=person.id,
                    encrypted_embedding=encrypted,
                    model_name="FaceNet-Spatial-L2",
                    model_version="v1.2",
                    created_at=datetime.utcnow()
                )
                db.add(face_emb)

                # 5. Create initial session record
                session = FaceSession(
                    person_id=person.id,
                    camera_id=camera_id,
                    tracking_id=tracking_id,
                    matched_at=datetime.utcnow(),
                    recognition_status="new_registered",
                    confidence=1.0
                )
                db.add(session)
                db.flush()

                # 6. Create initial expression observation
                expr_obs = ExpressionObservation(
                    person_id=person.id,
                    session_id=session.id,
                    expression_category=initial_expression,
                    model_confidence=expression_confidence,
                    observed_at=datetime.utcnow()
                )
                db.add(expr_obs)

                # 7. Audit log
                v_event = VerificationEvent(
                    session_id=session.id,
                    candidate_person_id=person.id,
                    similarity_score=0.0,
                    verification_result="approved_registration",
                    reviewed_by="AutomatedVerificationEngine",
                    created_at=datetime.utcnow()
                )
                db.add(v_event)

                db.commit()
                db.refresh(person)

                logger.info(f"Successfully registered new person: {person_code} (ID: {person.id})")

                return True, {
                    "person_id": person.id,
                    "person_code": person.person_code,
                    "name": person.name,
                    "registration_image_path": person.registration_image_path,
                    "registered_at": person.registered_at.isoformat(),
                    "status": "Registered"
                }, None

            except Exception as e:
                db.rollback()
                logger.error(f"Failed to register person: {e}")
                return False, None, str(e)

    def delete_person(self, db: Session, person_id: int) -> bool:
        """
        GDPR & Privacy compliance: Delete all biometric data, photos, and records permanently.
        """
        with self._reg_lock:
            try:
                person = db.query(Person).filter(Person.id == person_id).first()
                if not person:
                    return False

                # Delete image file from protected storage
                filename = f"{person.person_code}.jpg"
                filepath = settings.protected_storage_dir / filename
                if filepath.exists():
                    try:
                        filepath.unlink()
                    except Exception as e:
                        logger.warning(f"Could not remove snapshot file: {e}")

                db.delete(person)
                db.commit()
                logger.info(f"Permanently purged person {person_id} and all biometric records.")
                return True
            except Exception as e:
                db.rollback()
                logger.error(f"Error purging person: {e}")
                return False

registration_manager = RegistrationManager()
