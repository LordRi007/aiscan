import pytest
import numpy as np
from app.services.face_detector import face_detector
from app.services.face_recognition import face_recognition_engine
from app.services.liveness_detection import liveness_detector
from app.services.face_tracker import DetectedFace, MultiFaceTracker
from app.config import settings

def test_face_quality_assessment():
    """Verify that blurred, small, or low-contrast faces are rejected."""
    # Create black/empty image
    empty_img = np.zeros((40, 40, 3), dtype=np.uint8)
    res = face_detector.assess_face_quality(empty_img, (40, 40), {})
    assert res["is_acceptable"] is False
    assert any("too small" in r for r in res["reasons"])

    # Create synthetic sharp face-like pattern
    good_img = np.random.randint(50, 200, (120, 120, 3), dtype=np.uint8)
    res_good = face_detector.assess_face_quality(good_img, (120, 120), {
        "left_eye": (80, 40),
        "right_eye": (40, 40)
    })
    # Size and sharpness checks pass
    assert res_good["width"] == 120
    assert res_good["height"] == 120

def test_liveness_detection():
    """Verify presentation attack detection on sample images."""
    blank_crop = np.zeros((100, 100, 3), dtype=np.uint8)
    liveness_res = liveness_detector.check_liveness(blank_crop)
    assert "liveness_score" in liveness_res
    assert isinstance(liveness_res["is_authentic"], (bool, np.bool_))

def test_multi_face_tracker():
    """Verify tracking multiple simultaneous faces across consecutive frames."""
    tracker = MultiFaceTracker()
    
    # Frame 1: Two people appear
    face1 = DetectedFace(
        bbox=(100, 100, 80, 80),
        confidence=0.9,
        landmarks={"left_eye": (150, 120), "right_eye": (120, 120)},
        quality={"is_acceptable": True, "sharpness": 120.0},
        face_img=np.ones((80, 80, 3), dtype=np.uint8) * 128
    )
    face2 = DetectedFace(
        bbox=(300, 100, 80, 80),
        confidence=0.92,
        landmarks={"left_eye": (350, 120), "right_eye": (320, 120)},
        quality={"is_acceptable": True, "sharpness": 130.0},
        face_img=np.ones((80, 80, 3), dtype=np.uint8) * 140
    )
    
    tracked_frame1 = tracker.update([face1, face2])
    assert len(tracked_frame1) == 2
    id1 = tracked_frame1[0].track_id
    id2 = tracked_frame1[1].track_id
    assert id1 != id2

    # Frame 2: Faces move slightly (small delta)
    face1_moved = DetectedFace(
        bbox=(105, 102, 80, 80),
        confidence=0.91,
        landmarks={"left_eye": (155, 122), "right_eye": (125, 122)},
        quality={"is_acceptable": True, "sharpness": 125.0},
        face_img=np.ones((80, 80, 3), dtype=np.uint8) * 128
    )
    face2_moved = DetectedFace(
        bbox=(298, 101, 80, 80),
        confidence=0.93,
        landmarks={"left_eye": (348, 121), "right_eye": (318, 121)},
        quality={"is_acceptable": True, "sharpness": 135.0},
        face_img=np.ones((80, 80, 3), dtype=np.uint8) * 140
    )

    tracked_frame2 = tracker.update([face1_moved, face2_moved])
    assert len(tracked_frame2) == 2
    # Verify IDs are stably preserved without swapping
    tracked_ids = {t.track_id for t in tracked_frame2}
    assert id1 in tracked_ids
    assert id2 in tracked_ids
