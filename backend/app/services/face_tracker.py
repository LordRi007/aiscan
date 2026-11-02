import time
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from app.services.face_detector import DetectedFace

class TrackedFace:
    def __init__(self, track_id: int, detected_face: DetectedFace):
        self.track_id: int = track_id
        self.bbox: Tuple[int, int, int, int] = detected_face.bbox
        self.landmarks: Dict[str, Tuple[float, float]] = detected_face.landmarks
        self.quality: Dict[str, Any] = detected_face.quality
        self.face_img: np.ndarray = detected_face.face_img
        self.confidence: float = detected_face.confidence
        
        # Tracking telemetry & temporal history
        self.first_seen: float = time.time()
        self.last_seen: float = time.time()
        self.frames_tracked: int = 1
        self.missed_frames: int = 0
        self.high_quality_frame_count: int = 1 if detected_face.quality["is_acceptable"] else 0
        
        # Identity Verification State
        # States: 'CHECKING', 'REGISTERED', 'POTENTIALLY_NEW', 'VERIFICATION_REQUIRED', 'NEW_REGISTERED'
        self.verification_status: str = "CHECKING"
        self.person_id: Optional[str] = None # e.g. "FACE-000001"
        self.person_name: Optional[str] = None
        self.match_confidence: float = 0.0
        self.is_duplicate_checked: bool = False
        
        # Liveness & Authenticity
        self.liveness_score: float = 0.0
        self.is_authentic: bool = False
        
        # Facial Expression State
        self.expression: str = "Neutral"
        self.expression_confidence: float = 0.0
        
        # Collected quality embeddings across frames for multi-frame proof
        self.collected_embeddings: List[np.ndarray] = []
        self.best_snapshot: Optional[np.ndarray] = detected_face.face_img
        self.best_sharpness: float = detected_face.quality.get("sharpness", 0.0)

    def update(self, detected_face: DetectedFace):
        self.bbox = detected_face.bbox
        self.landmarks = detected_face.landmarks
        self.quality = detected_face.quality
        self.face_img = detected_face.face_img
        self.confidence = detected_face.confidence
        self.last_seen = time.time()
        self.frames_tracked += 1
        self.missed_frames = 0
        
        if detected_face.quality["is_acceptable"]:
            self.high_quality_frame_count += 1
            # Update best snapshot candidate
            sharpness = detected_face.quality.get("sharpness", 0.0)
            if sharpness > self.best_sharpness:
                self.best_sharpness = sharpness
                self.best_snapshot = detected_face.face_img

def calculate_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Calculate Intersection over Union (IoU) of two bounding boxes (x, y, w, h)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interW = max(0, xB - xA)
    interH = max(0, yB - yA)
    interArea = interW * interH

    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]

    unionArea = float(boxAArea + boxBArea - interArea)
    if unionArea == 0:
        return 0.0
    return interArea / unionArea

def calculate_centroid_distance(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Euclidean distance between center points of two boxes."""
    cAx = boxA[0] + boxA[2] / 2.0
    cAy = boxA[1] + boxA[3] / 2.0
    cBx = boxB[0] + boxB[2] / 2.0
    cBy = boxB[1] + boxB[3] / 2.0
    return np.sqrt((cAx - cBx) ** 2 + (cAy - cBy) ** 2)

class MultiFaceTracker:
    """
    Real-Time Multi-Object Tracker for Human Faces.
    Maintains independent track trajectories, prevents ID swaps, and handles occlusions.
    """
    def __init__(self, max_missed_frames: int = 15, iou_threshold: float = 0.35, max_distance: float = 120.0):
        self._next_id: int = 1
        self._active_tracks: Dict[int, TrackedFace] = {}
        self._max_missed_frames = max_missed_frames
        self._iou_threshold = iou_threshold
        self._max_distance = max_distance

    def update(self, detected_faces: List[DetectedFace]) -> List[TrackedFace]:
        """
        Associate newly detected faces in current frame with existing active tracks.
        """
        # Increment missed frames for all existing active tracks initially
        for track in self._active_tracks.values():
            track.missed_frames += 1

        unmatched_detections = list(range(len(detected_faces)))
        matched_tracks = set()

        if self._active_tracks and detected_faces:
            # Construct cost matrix using combination of IoU and Centroid Proximity
            active_track_ids = list(self._active_tracks.keys())
            
            # Prioritize matching by best IoU first
            matches: List[Tuple[float, int, int]] = [] # (score, track_id, detection_idx)
            for track_id in active_track_ids:
                track = self._active_tracks[track_id]
                for det_idx, det in enumerate(detected_faces):
                    iou = calculate_iou(track.bbox, det.bbox)
                    dist = calculate_centroid_distance(track.bbox, det.bbox)
                    
                    # Acceptable if strong IoU or small centroid movement
                    if iou >= self._iou_threshold or (dist <= self._max_distance and iou > 0.15):
                        # Combine IoU and normalized distance into affinity score
                        score = iou - (dist / (self._max_distance * 4.0))
                        matches.append((score, track_id, det_idx))

            # Sort descending by match score
            matches.sort(key=lambda m: m[0], reverse=True)

            used_tracks = set()
            used_dets = set()
            for score, track_id, det_idx in matches:
                if track_id not in used_tracks and det_idx not in used_dets:
                    used_tracks.add(track_id)
                    used_dets.add(det_idx)
                    self._active_tracks[track_id].update(detected_faces[det_idx])
                    if det_idx in unmatched_detections:
                        unmatched_detections.remove(det_idx)

        # Create new tracks for unmatched detections
        for det_idx in unmatched_detections:
            new_id = self._next_id
            self._next_id += 1
            new_track = TrackedFace(new_id, detected_faces[det_idx])
            self._active_tracks[new_id] = new_track

        # Remove dead tracks that exceeded max missed frames
        dead_tracks = [tid for tid, track in self._active_tracks.items() if track.missed_frames > self._max_missed_frames]
        for tid in dead_tracks:
            del self._active_tracks[tid]

        # Return only currently active and visible tracks in this frame
        return [track for track in self._active_tracks.values() if track.missed_frames == 0]

    def get_track(self, track_id: int) -> Optional[TrackedFace]:
        return self._active_tracks.get(track_id)

    def get_all_active_tracks(self) -> List[TrackedFace]:
        return list(self._active_tracks.values())

face_tracker = MultiFaceTracker()
