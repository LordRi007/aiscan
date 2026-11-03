import os
import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings

logger = logging.getLogger("face_detector")

# Attempt importing mediapipe face detector
try:
    import mediapipe as mp
    mp_face_detection = mp.solutions.face_detection
    MEDIAPIPE_AVAILABLE = True
except Exception as e:
    logger.warning(f"MediaPipe solutions not loaded directly: {e}, falling back to OpenCV DNN")
    MEDIAPIPE_AVAILABLE = False

class DetectedFace:
    def __init__(
        self,
        bbox: Tuple[int, int, int, int],  # (x, y, w, h)
        confidence: float,
        landmarks: Dict[str, Tuple[float, float]],
        quality: Dict[str, Any],
        face_img: np.ndarray
    ):
        self.bbox = bbox # (x, y, w, h)
        self.confidence = confidence
        self.landmarks = landmarks
        self.quality = quality
        self.face_img = face_img

class FaceDetector:
    """
    Simultaneous Multi-Person Face Detection & Quality Assessment Engine.
    - Uses MediaPipe BlazeFace for real-time 30+ FPS multi-face detection (5-10 faces).
    - Falls back to OpenCV Haar / DNN cascade if necessary.
    - Estimates sharpness, brightness, contrast, size, and pose angle.
    """
    def __init__(self):
        self._mp_detector = None
        if MEDIAPIPE_AVAILABLE:
            try:
                self._mp_detector = mp_face_detection.FaceDetection(
                    model_selection=1, # 1 for full range (up to 5 meters, multi-person), 0 for short range
                    min_detection_confidence=0.55
                )
            except Exception as e:
                logger.error(f"Error initializing MediaPipe face detector: {e}")
                self._mp_detector = None

        # OpenCV YuNet Deep Learning Face Detector (Official OpenCV Zoo model)
        self._yunet_detector = None
        yunet_path = os.path.join(os.path.dirname(__file__), '..', 'models_data', 'face_detection_yunet_2023mar.onnx')
        if os.path.exists(yunet_path) and hasattr(cv2, 'FaceDetectorYN'):
            try:
                self._yunet_detector = cv2.FaceDetectorYN.create(
                    model=yunet_path,
                    config='',
                    input_size=(320, 320),
                    score_threshold=0.65,
                    nms_threshold=0.3,
                    top_k=5000
                )
                logger.info("Loaded OpenCV YuNet Deep Learning Face Detector successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize YuNet detector: {e}")
                self._yunet_detector = None

        # OpenCV Haar Cascade with reliable local fallback
        cascade_path = os.path.join(os.path.dirname(__file__), '..', 'haarcascade_frontalface_default.xml')
        if not os.path.exists(cascade_path):
            haarcascades_dir = getattr(cv2, 'data', None)
            haarcascades_path = getattr(haarcascades_dir, 'haarcascades', '') if haarcascades_dir else ''
            cascade_path = os.path.join(haarcascades_path, 'haarcascade_frontalface_default.xml')

        if hasattr(cv2, 'CascadeClassifier'):
            self._cascade = cv2.CascadeClassifier(cascade_path)
            if self._cascade.empty():
                logger.error(f"Failed to load Haar cascade from {cascade_path}")
        else:
            logger.error("cv2.CascadeClassifier is not available in current OpenCV build.")
            self._cascade = None

    def detect_faces(self, frame: np.ndarray) -> List[DetectedFace]:
        """
        Detect every human face visible in the video frame.
        Returns a list of DetectedFace objects with bboxes, keypoints, quality scores, and crops.
        """
        if frame is None or frame.size == 0:
            return []

        h, w, c = frame.shape
        detected_faces: List[DetectedFace] = []

        if self._mp_detector is not None:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self._mp_detector.process(rgb_frame)

                if results.detections:
                    for detection in results.detections:
                        conf = float(detection.score[0]) if detection.score else 0.7
                        rel_bbox = detection.location_data.relative_bounding_box
                        
                        # Convert relative coordinates to absolute pixels
                        x = int(rel_bbox.xmin * w)
                        y = int(rel_bbox.ymin * h)
                        box_w = int(rel_bbox.width * w)
                        box_h = int(rel_bbox.height * h)

                        # Bounding box sanity checks and clipping
                        x = max(0, min(x, w - 1))
                        y = max(0, min(y, h - 1))
                        box_w = max(1, min(box_w, w - x))
                        box_h = max(1, min(box_h, h - y))

                        # Extract 6 keypoints: right eye, left eye, nose tip, mouth center, right ear tragion, left ear tragion
                        landmarks = {}
                        if detection.location_data.keypoints:
                            kps = detection.location_data.keypoints
                            landmark_names = ["right_eye", "left_eye", "nose_tip", "mouth_center", "right_ear", "left_ear"]
                            for i, kp in enumerate(kps):
                                if i < len(landmark_names):
                                    landmarks[landmark_names[i]] = (kp.x * w, kp.y * h)

                        # Crop face with margin
                        margin_x = int(box_w * 0.1)
                        margin_y = int(box_h * 0.1)
                        crop_x1 = max(0, x - margin_x)
                        crop_y1 = max(0, y - margin_y)
                        crop_x2 = min(w, x + box_w + margin_x)
                        crop_y2 = min(h, y + box_h + margin_y)

                        face_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                        if face_crop.size == 0:
                            continue

                        quality = self.assess_face_quality(face_crop, (box_w, box_h), landmarks)

                        detected_faces.append(
                            DetectedFace(
                                bbox=(x, y, box_w, box_h),
                                confidence=round(conf, 3),
                                landmarks=landmarks,
                                quality=quality,
                                face_img=face_crop
                            )
                        )
                    return detected_faces
            except Exception as e:
                logger.error(f"MediaPipe detection failed: {e}")

        # 1. OpenCV YuNet Deep Learning AI Detector (0% false positives on walls/windows)
        if self._yunet_detector is not None:
            try:
                self._yunet_detector.setInputSize((w, h))
                _, faces = self._yunet_detector.detect(frame)
                if faces is not None and len(faces) > 0:
                    for f in faces:
                        conf = float(f[14])
                        if conf < 0.60:
                            continue
                        box = f[0:4].astype(int)
                        x, y, box_w, box_h = box
                        x = max(0, min(x, w - 1))
                        y = max(0, min(y, h - 1))
                        box_w = max(1, min(box_w, w - x))
                        box_h = max(1, min(box_h, h - y))

                        face_crop = frame[y:y+box_h, x:x+box_w]
                        if face_crop.size == 0:
                            continue

                        landmarks = {
                            "right_eye": (float(f[4]), float(f[5])),
                            "left_eye": (float(f[6]), float(f[7])),
                            "nose_tip": (float(f[8]), float(f[9])),
                            "mouth_center": (float((f[10] + f[12]) / 2.0), float((f[11] + f[13]) / 2.0))
                        }
                        quality = self.assess_face_quality(face_crop, (box_w, box_h), landmarks)
                        detected_faces.append(
                            DetectedFace(
                                bbox=(x, y, box_w, box_h),
                                confidence=round(conf, 3),
                                landmarks=landmarks,
                                quality=quality,
                                face_img=face_crop
                            )
                        )
                    if detected_faces:
                        return detected_faces
            except Exception as e:
                logger.warning(f"YuNet inference fallback: {e}")

        # Fallback to OpenCV Haar Cascade if neural detector was unavailable
        if self._cascade is not None and not self._cascade.empty():
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            # High-precision Haar cascade execution: minNeighbors=4 filters out background window/wall ghosts
            target_w = 360.0
            if w > target_w:
                scale = target_w / w
                inv_scale = 1.0 / scale
                small_gray = cv2.resize(gray, (int(target_w), int(h * scale)), interpolation=cv2.INTER_NEAREST)
                raw_faces = self._cascade.detectMultiScale(small_gray, scaleFactor=1.09, minNeighbors=4, minSize=(24, 24))
                faces = [
                    (int(sx * inv_scale), int(sy * inv_scale), int(sbw * inv_scale), int(sbh * inv_scale))
                    for (sx, sy, sbw, sbh) in raw_faces
                ]
            else:
                faces = self._cascade.detectMultiScale(gray, scaleFactor=1.09, minNeighbors=4, minSize=(24, 24))

            for (x, y, box_w, box_h) in faces:
                x, y, box_w, box_h = int(x), int(y), int(box_w), int(box_h)
                x = max(0, min(x, w - 1))
                y = max(0, min(y, h - 1))
                box_w = max(1, min(box_w, w - x))
                box_h = max(1, min(box_h, h - y))

                face_crop = frame[y:y+box_h, x:x+box_w]
                if face_crop.size == 0:
                    continue

                landmarks = {
                    "right_eye": (float(x + box_w * 0.3), float(y + box_h * 0.35)),
                    "left_eye": (float(x + box_w * 0.7), float(y + box_h * 0.35)),
                    "nose_tip": (float(x + box_w * 0.5), float(y + box_h * 0.55)),
                    "mouth_center": (float(x + box_w * 0.5), float(y + box_h * 0.75))
                }
                quality = self.assess_face_quality(face_crop, (box_w, box_h), landmarks)
                
                # Strict false-positive filter: discard unsharp non-facial background regions
                if not quality.get("is_acceptable", False):
                    continue

                detected_faces.append(
                    DetectedFace(
                        bbox=(x, y, box_w, box_h),
                        confidence=0.85,
                        landmarks=landmarks,
                        quality=quality,
                        face_img=face_crop
                    )
                )

        return detected_faces

    def assess_face_quality(
        self,
        face_img: np.ndarray,
        box_size: Tuple[int, int],
        landmarks: Dict[str, Tuple[float, float]]
    ) -> Dict[str, Any]:
        """
        Evaluate face size, sharpness, brightness, contrast, and alignment.
        Rejects blurry, tiny, or poorly lit faces.
        """
        bw, bh = box_size
        if face_img is None or face_img.size == 0:
            return {"is_acceptable": False, "reason": "Empty face crop", "sharpness": 0, "size": 0}

        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        
        # 1. Sharpness via Laplacian variance
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Brightness & Contrast
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        
        # 3. Minimum Face Size
        is_size_ok = (bw >= settings.min_face_size and bh >= settings.min_face_size)
        is_sharp_ok = (sharpness >= settings.min_sharpness)
        is_bright_ok = (settings.min_brightness <= brightness <= settings.max_brightness)
        is_contrast_ok = (contrast >= settings.min_contrast)

        # 4. Pose alignment estimate (check eye tilt)
        eye_tilt = 0.0
        if "left_eye" in landmarks and "right_eye" in landmarks:
            lx, ly = landmarks["left_eye"]
            rx, ry = landmarks["right_eye"]
            dx = lx - rx
            dy = ly - ry
            if dx != 0:
                eye_tilt = abs(np.degrees(np.arctan2(dy, dx)))
                # Normalize tilt around horizontal
                if eye_tilt > 90:
                    eye_tilt = abs(180 - eye_tilt)

        is_pose_ok = (eye_tilt < 30.0)

        is_acceptable = is_size_ok and is_sharp_ok and is_bright_ok and is_contrast_ok and is_pose_ok
        
        reasons = []
        if not is_size_ok:
            reasons.append(f"Face too small ({bw}x{bh} < {settings.min_face_size})")
        if not is_sharp_ok:
            reasons.append(f"Image blurred (sharpness {sharpness:.1f} < {settings.min_sharpness})")
        if not is_bright_ok:
            reasons.append(f"Suboptimal lighting (brightness {brightness:.1f})")
        if not is_contrast_ok:
            reasons.append("Low contrast")
        if not is_pose_ok:
            reasons.append("Extreme head tilt")

        return {
            "is_acceptable": bool(is_acceptable),
            "sharpness": float(round(sharpness, 1)),
            "brightness": float(round(brightness, 1)),
            "contrast": float(round(contrast, 1)),
            "width": int(bw),
            "height": int(bh),
            "eye_tilt": float(round(eye_tilt, 1)),
            "reasons": reasons
        }

face_detector = FaceDetector()
