import time
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app.config import settings, decrypt_embedding
from app.models.person import Person
from app.models.face_embedding import FaceEmbedding
from app.models.verification_event import VerificationEvent
from app.services.face_tracker import TrackedFace
from app.services.face_recognition import face_recognition_engine
from app.services.liveness_detection import liveness_detector
from app.services.expression_detector import expression_detector
from app.services.registration_manager import registration_manager

logger = logging.getLogger("face_verification")

class FaceVerificationEngine:
    """
    Dedicated Face Identity Verification Engine.
    PRIMARY OBJECTIVE: Prevent duplicate person registration.
    
    Implements 7-step rigorous verification pipeline before snapshot capture:
    Step 1: Detect a stable face with image quality qualification
    Step 2: Check presentation authenticity (anti-spoofing)
    Step 3: Generate normalized face embedding
    Step 4: Search existing database using calibrated thresholds
    Step 5: Verify evidence across multiple consecutive frames
    Step 6: Final duplicate verification & simultaneous multi-person cross-check
    Step 7: Capture snapshot and register ONLY after confirmed approval
    """
    def __init__(self):
        self._cached_registered_embeddings: List[Dict[str, Any]] = []
        self._cache_timestamp: float = 0.0
        self._cache_ttl_seconds: float = 2.0  # Refresh cache every 2s
        self._pending_registrations: Dict[int, float] = {} # track_id -> timestamp

    def get_registered_embeddings(self, db: Session, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Retrieve and decrypt registered person embeddings from database with caching."""
        now = time.time()
        if not force_refresh and (now - self._cache_timestamp < self._cache_ttl_seconds) and self._cached_registered_embeddings:
            return self._cached_registered_embeddings

        embeddings_list = []
        try:
            records = db.query(Person, FaceEmbedding).join(FaceEmbedding, Person.id == FaceEmbedding.person_id).all()
            for person, emb_record in records:
                try:
                    decrypted_bytes = decrypt_embedding(emb_record.encrypted_embedding)
                    emb_array = np.frombuffer(decrypted_bytes, dtype=np.float32)
                    embeddings_list.append({
                        "person_id": person.id,
                        "person_code": person.person_code,
                        "name": person.name,
                        "embedding": emb_array,
                        "registration_image": person.registration_image_path
                    })
                except Exception as e:
                    logger.error(f"Error decrypting embedding for person {person.person_code}: {e}")

            self._cached_registered_embeddings = embeddings_list
            self._cache_timestamp = now
        except Exception as e:
            logger.error(f"Database error querying registered embeddings: {e}")

        return embeddings_list

    def process_tracked_faces(
        self,
        db: Session,
        tracked_faces: List[TrackedFace],
        camera_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all currently visible faces in parallel.
        Ensures multi-person independence, cross-checking, and zero duplicate registrations.
        """
        registered_identities = self.get_registered_embeddings(db)
        results = []
        
        # Collect new embeddings from currently tracked faces to enable cross-person comparison
        current_frame_embeddings: Dict[int, np.ndarray] = {}

        for face in tracked_faces:
            # If this face had a temporary detection miss in the current frame, smoothly retain last state
            if getattr(face, "missed_frames", 0) > 0:
                continue

            # 1. Image Quality Qualification (Step 1)
            quality = face.quality
            is_quality_acceptable = quality.get("is_acceptable", False)

            # Determine if this face is already stably identified to avoid redundant per-frame heavy compute
            is_already_registered = (getattr(face, "verification_status", None) == "REGISTERED")
            should_recheck_identity = (face.frames_tracked % 12 == 0) or not is_already_registered

            # 2. Extract current face embedding (Step 3)
            if should_recheck_identity or not hasattr(face, "_cached_emb") or face._cached_emb is None:
                current_emb = face_recognition_engine.extract_embedding(face.face_img, face.landmarks)
                face._cached_emb = current_emb
            else:
                current_emb = face._cached_emb

            current_frame_embeddings[face.track_id] = current_emb

            # Add to collected embeddings history for multi-frame proof
            if is_quality_acceptable:
                face.collected_embeddings.append(current_emb)
                if len(face.collected_embeddings) > 15:
                    face.collected_embeddings.pop(0)

            # 3. Analyze tentative facial expression with rich emoji (always real-time 30+ FPS)
            expr_result = expression_detector.analyze_expression(face.face_img, face.landmarks)
            face.expression = expr_result["category"]
            face.expression_emoji = expr_result.get("emoji", "😐")
            face.expression_confidence = expr_result["confidence"]

            if is_already_registered and not should_recheck_identity:
                # Retain verified identity and continue with zero database latency
                continue

            # 4. Check presentation authenticity / liveness (Step 2)
            liveness_res = liveness_detector.check_liveness(face.face_img)
            face.liveness_score = liveness_res["liveness_score"]
            face.is_authentic = liveness_res["is_authentic"]

            # 5. Search database for existing identity match (Step 4)
            match_res = face_recognition_engine.search_candidates(current_emb, registered_identities)
            decision = match_res["decision"]
            best_match = match_res["best_match"]
            similarity = match_res["similarity"]

            # Branching logic based on identity verification:
            if decision == "MATCH" and best_match:
                # EXISTING PERSON RECOGNIZED!
                # Section 5: Recognized -> Live Expression Overlay -> NO NEW SNAPSHOT
                face.verification_status = "REGISTERED"
                face.person_id = best_match["person_code"]
                face.person_name = best_match["name"]
                face.match_confidence = match_res["confidence"]

            elif decision == "UNCERTAIN":
                # AMBIGUOUS MATCH: Flag for manual review, NEVER register automatically
                face.verification_status = "VERIFICATION_REQUIRED"
                face.person_id = None
                face.person_name = "Ambiguous Identity"
                face.match_confidence = match_res["confidence"]

            else:
                # POTENTIALLY NEW IDENTITY: Must satisfy multi-frame proof + quality + authenticity
                if not is_quality_acceptable:
                    face.verification_status = "CHECKING"
                    face.person_id = None
                    face.person_name = "Checking Quality..."
                elif not face.is_authentic:
                    face.verification_status = "VERIFICATION_REQUIRED"
                    face.person_id = None
                    face.person_name = "Authenticity Check Failed"
                elif face.high_quality_frame_count < settings.min_verification_frames:
                    # Step 5: Verify across several frames
                    face.verification_status = "CHECKING"
                    face.person_id = None
                    face.person_name = f"Verifying ({face.high_quality_frame_count}/{settings.min_verification_frames})..."
                else:
                    # Verified as stable, high quality, authentic, and unmatched
                    face.verification_status = "POTENTIALLY_NEW"
                    face.person_id = None
                    face.person_name = "Verified New Person"

        # Now handle Registration for Confidently New Faces (Step 6 & 7)
        # Simultaneous Multi-Person Verification Check (Section 18.3)
        candidate_new_faces = [f for f in tracked_faces if f.verification_status == "POTENTIALLY_NEW" and not f.is_duplicate_checked]
        
        for i, new_face in enumerate(candidate_new_faces):
            # Step 6: Cross-check against other simultaneously detected candidate faces
            is_cross_duplicate = False
            emb_i = current_frame_embeddings.get(new_face.track_id)
            
            for j, other_face in enumerate(candidate_new_faces):
                if i != j and emb_i is not None:
                    emb_j = current_frame_embeddings.get(other_face.track_id)
                    sim = face_recognition_engine.compute_similarity(emb_i, emb_j)
                    if sim >= settings.similarity_match_threshold:
                        # Two tracking boxes belong to the same person entering at once!
                        is_cross_duplicate = True
                        other_face.verification_status = "CHECKING"
                        break

            if is_cross_duplicate:
                logger.info(f"Cross-duplicate detected for track {new_face.track_id}. Deferring duplicate registration.")
                continue

            # Step 6: Final check against DB again to guarantee freshness
            latest_identities = self.get_registered_embeddings(db, force_refresh=True)
            recheck = face_recognition_engine.search_candidates(emb_i, latest_identities)
            if recheck["decision"] != "NEW_IDENTITY":
                new_face.verification_status = "REGISTERED" if recheck["decision"] == "MATCH" else "VERIFICATION_REQUIRED"
                if recheck["best_match"]:
                    new_face.person_id = recheck["best_match"]["person_code"]
                    new_face.person_name = recheck["best_match"]["name"]
                continue

            # Consent Check: If consent required and not confirmed, wait
            if settings.require_explicit_consent:
                new_face.verification_status = "POTENTIALLY_NEW"
                new_face.person_name = "Awaiting Consent"
                continue

            # Auto-registration if enabled
            if settings.auto_register_verified_new and emb_i is not None:
                # Step 7: Capture high-quality snapshot candidate and register
                snapshot_to_save = new_face.best_snapshot if new_face.best_snapshot is not None else new_face.face_img
                
                # Compute averaged high-quality embedding from collected frames for maximum accuracy
                if new_face.collected_embeddings:
                    stacked = np.array(new_face.collected_embeddings)
                    mean_emb = np.mean(stacked, axis=0)
                    norm = np.linalg.norm(mean_emb)
                    if norm > 0:
                        final_emb = mean_emb / norm
                    else:
                        final_emb = emb_i
                else:
                    final_emb = emb_i

                success, reg_info, err = registration_manager.register_new_person(
                    db=db,
                    snapshot_img=snapshot_to_save,
                    embedding=final_emb,
                    initial_expression=new_face.expression,
                    expression_confidence=new_face.expression_confidence,
                    name=None, # Will receive default Person FACE-XXXXXX
                    consent_status="consented",
                    camera_id=camera_id,
                    tracking_id=new_face.track_id
                )

                if success and reg_info:
                    new_face.verification_status = "NEW_REGISTERED"
                    new_face.person_id = reg_info["person_code"]
                    new_face.person_name = reg_info["name"]
                    new_face.is_duplicate_checked = True
                    # Invalidate cache so subsequent frames immediately recognize this person
                    self.get_registered_embeddings(db, force_refresh=True)
                else:
                    logger.error(f"Registration failed for track {new_face.track_id}: {err}")
                    new_face.verification_status = "VERIFICATION_REQUIRED"
                    new_face.person_name = "Registration Error"

        # Format output telemetry for client / websocket
        for face in tracked_faces:
            # Strictly filter out non-face false positives (e.g. background window/furniture artifacts)
            # Only display faces that are:
            # 1) Confirmed registered / newly registered, OR
            # 2) Candidate human faces that actually pass facial quality qualification
            if face.verification_status not in ["REGISTERED", "NEW_REGISTERED"]:
                if not face.quality.get("is_acceptable", False) or face.confidence < 0.60:
                    continue

            # Color logic according to Section 3:
            # Registered: Green
            # Unmatched / Checking: Yellow
            # Low confidence / Verification Required: Gray
            # New Person Registered: Blue
            if face.verification_status == "REGISTERED":
                box_color = "green"
                status_label = "Registered Person"
            elif face.verification_status == "NEW_REGISTERED":
                box_color = "blue"
                status_label = "New Person Registered"
            elif face.verification_status == "VERIFICATION_REQUIRED":
                box_color = "gray"
                status_label = "Verification Required"
            else: # CHECKING or POTENTIALLY_NEW
                box_color = "yellow"
                status_label = "Checking Registration..."

            results.append({
                "track_id": int(face.track_id),
                "bbox": [int(x) for x in face.bbox], # [x, y, w, h]
                "verification_status": str(face.verification_status),
                "box_color": str(box_color),
                "status_label": str(status_label),
                "person_id": face.person_id,
                "person_name": face.person_name,
                "match_confidence": float(face.match_confidence),
                "expression": str(face.expression),
                "expression_emoji": str(getattr(face, "expression_emoji", "😐")),
                "expression_display": f"{face.expression} {getattr(face, 'expression_emoji', '😐')}",
                "expression_confidence": float(face.expression_confidence),
                "liveness_score": float(face.liveness_score),
                "is_authentic": bool(face.is_authentic),
                "sharpness": float(face.quality.get("sharpness", 0.0)),
                "is_quality_acceptable": bool(face.quality.get("is_acceptable", False)),
                "landmarks": {k: [float(v[0]), float(v[1])] for k, v in face.landmarks.items()},
                "frames_tracked": int(face.frames_tracked),
                "high_quality_frames": int(face.high_quality_frame_count)
            })

        return results

face_verification_engine = FaceVerificationEngine()
