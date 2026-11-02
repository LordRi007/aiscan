import cv2
import numpy as np
import logging
from typing import Dict, Any, Tuple, Optional
from app.config import settings

logger = logging.getLogger("expression_detector")

EMOJI_MAP = {
    "Happy": "😊",
    "Laughing": "😄",
    "Neutral": "😐",
    "Surprised": "😲",
    "Thinking": "🤔",
    "Sad": "🙁",
    "Angry": "😠",
    "Fearful": "😨",
    "Disgusted": "🤢",
    "Sleepy": "😴",
    "Uncertain": "🧐",
}

class ExpressionDetector:
    """
    Live Facial Expression & Mood Classification Engine with Rich Emoji Support.
    Supported Categories:
      - Happy 😊 (Smile, upturned lip corners, cheek lift)
      - Laughing 😄 (Wide open smile, high cheek and eye activation)
      - Neutral 😐 (Calm, relaxed resting baseline)
      - Surprised 😲 (Wide open mouth / dropped jaw, raised eyebrows)
      - Thinking 🤔 (Slight tilt, focused expression, pursed lips)
      - Sad 🙁 (Turned down lip corners, slight droop)
      - Angry 😠 (Corrugator furrowing + tight lips)
      - Fearful 😨 (Widened eyes + slightly open mouth)
      - Disgusted 🤢 (Wrinkled nose, curled upper lip)
      - Sleepy 😴 (Lower eye openness, relaxed jaw)
      - Uncertain 🧐 (Ambiguous or rapidly shifting expression)

    IMPORTANT SCIENTIFIC LIMITATION:
    Facial expressions reflect surface muscular movements (Action Units) and visual morphology.
    They do NOT establish internal psychological states or genuine feelings.
    """
    def __init__(self):
        self.categories = list(EMOJI_MAP.keys())
        self.emoji_map = EMOJI_MAP

    def analyze_expression(
        self,
        face_img: np.ndarray,
        landmarks: Optional[Dict[str, Tuple[float, float]]] = None
    ) -> Dict[str, Any]:
        """
        Estimate facial expression category, emoji, and confidence based on facial Action Units.
        """
        if not settings.enable_expression_analysis or face_img is None or face_img.size == 0:
            return {
                "category": "Neutral",
                "emoji": "😐",
                "display_name": "Neutral 😐",
                "confidence": 80.0,
                "is_uncertain": False,
                "disclaimer": "Estimated visual expression morphology only; not internal feelings."
            }

        h, w = face_img.shape[:2]
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY) if len(face_img.shape) == 3 else face_img

        # Initialize base priors (Neutral is natural baseline for human resting face)
        scores = {cat: 0.05 for cat in self.categories}
        scores["Neutral"] = 0.50 # Strong prior to prevent false angry/surprised on resting face

        # 1. Mouth Region Analysis (Action Units 12, 15, 25, 26)
        # Lower 35% of face, middle 60%
        mouth_y1 = int(h * 0.62)
        mouth_y2 = int(h * 0.94)
        mouth_x1 = int(w * 0.20)
        mouth_x2 = int(w * 0.80)
        mouth_crop = gray[mouth_y1:mouth_y2, mouth_x1:mouth_x2]

        mouth_openness = 0.0
        mouth_width_ratio = 0.0
        smile_intensity = 0.0

        if mouth_crop.size > 0:
            mh, mw = mouth_crop.shape
            # Detect dark mouth cavity (open mouth / jaw drop)
            dark_pixels = np.sum(mouth_crop < 45) / float(mouth_crop.size)
            mouth_openness = dark_pixels

            # Detect teeth / bright smile
            teeth_pixels = np.sum(mouth_crop > 175) / float(mouth_crop.size)

            # Analyze mouth curvature: compare corners vs center
            corner_w = max(1, int(mw * 0.22))
            left_corner = mouth_crop[:, :corner_w]
            right_corner = mouth_crop[:, -corner_w:]
            center_mouth = mouth_crop[:, corner_w:-corner_w]

            # In a smile, center mouth is lower or teeth are visible
            if teeth_pixels > 0.04 and dark_pixels < 0.15:
                smile_intensity = 0.6 + min(0.35, teeth_pixels * 3.0)
            elif left_corner.size > 0 and right_corner.size > 0 and center_mouth.size > 0:
                # Vertical center of mass in corners vs center
                cy = mh / 2.0
                c_mean = center_mouth.mean()
                corn_mean = (left_corner.mean() + right_corner.mean()) / 2.0
                if corn_mean < c_mean - 10:
                    smile_intensity = 0.45

        # 2. Eye & Upper Face Analysis (Action Units 4, 5, 43)
        eye_y1 = int(h * 0.22)
        eye_y2 = int(h * 0.52)
        eye_x1 = int(w * 0.15)
        eye_x2 = int(w * 0.85)
        eye_crop = gray[eye_y1:eye_y2, eye_x1:eye_x2]

        eye_openness = 0.5
        if eye_crop.size > 0:
            # High vertical gradient indicates wide open eyes
            eh, ew = eye_crop.shape
            v_grad = np.abs(cv2.Sobel(eye_crop, cv2.CV_64F, 0, 1, ksize=3)).mean()
            # Normalize eye gradient
            eye_openness = min(1.0, max(0.1, v_grad / 40.0))

        # 3. Inter-brow Glabella (between eyebrows) - avoids hair interference
        brow_y1 = int(h * 0.28)
        brow_y2 = int(h * 0.42)
        brow_x1 = int(w * 0.40)
        brow_x2 = int(w * 0.60)
        glabella_crop = gray[brow_y1:brow_y2, brow_x1:brow_x2]

        brow_furrow = 0.0
        if glabella_crop.size > 0:
            # Vertical wrinkles between eyebrows (AU4)
            h_grad = np.abs(cv2.Sobel(glabella_crop, cv2.CV_64F, 1, 0, ksize=3)).mean()
            brow_furrow = min(1.0, h_grad / 50.0)

        # 4. Integrate Action Units into Mood Scores
        # Happy / Laughing
        if smile_intensity > 0.5:
            scores["Happy"] += smile_intensity * 0.8
            scores["Neutral"] *= 0.3
            if mouth_openness > 0.06:
                scores["Laughing"] += 0.75
        elif smile_intensity > 0.3:
            scores["Happy"] += 0.4

        # Surprised (Wide open mouth + wide eyes)
        if mouth_openness > 0.15 and eye_openness > 0.45:
            scores["Surprised"] += 0.85
            scores["Neutral"] *= 0.2
        elif mouth_openness > 0.09:
            scores["Surprised"] += 0.45

        # Thinking / Focused (Slight furrow + closed mouth + neutral smile)
        if brow_furrow > 0.4 and mouth_openness < 0.03 and smile_intensity < 0.2:
            scores["Thinking"] += 0.65
            scores["Neutral"] *= 0.5

        # Angry (Strong furrow + tightened eyes + narrow mouth)
        if brow_furrow > 0.65 and mouth_openness < 0.02 and smile_intensity < 0.1:
            scores["Angry"] += 0.75
            scores["Neutral"] *= 0.2

        # Sad (Drooping mouth corners + low openness)
        if smile_intensity < 0.1 and mouth_openness < 0.03 and eye_openness < 0.35 and brow_furrow < 0.3:
            scores["Sad"] += 0.45

        # Fearful (Wide eyes + small tense mouth opening)
        if eye_openness > 0.75 and 0.03 < mouth_openness < 0.10:
            scores["Fearful"] += 0.55

        # Disgusted (Curled lip + wrinkled nose bridge)
        if brow_furrow > 0.5 and smile_intensity > 0.2 and mouth_openness < 0.05:
            scores["Disgusted"] += 0.50

        # Sleepy / Tired (Very low eye gradient / drooping lids)
        if eye_openness < 0.25 and mouth_openness < 0.04:
            scores["Sleepy"] += 0.60
            scores["Neutral"] *= 0.6

        # Determine winning expression
        sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        top_cat, top_score = sorted_scores[0]
        second_cat, second_score = sorted_scores[1]

        # If difference between top categories is too narrow and top score is low, mark Uncertain
        margin = top_score - second_score
        if margin < 0.06 and top_score < 0.35:
            top_cat = "Uncertain"
            top_score = 0.50
            is_uncertain = True
        else:
            is_uncertain = (top_cat == "Uncertain")

        emoji = EMOJI_MAP.get(top_cat, "😐")
        confidence = min(96.0, max(58.0, top_score * 120.0))

        return {
            "category": top_cat,
            "emoji": emoji,
            "display_name": f"{top_cat} {emoji}",
            "confidence": round(confidence, 1),
            "is_uncertain": is_uncertain,
            "all_scores": {k: round(v, 2) for k, v in sorted_scores[:5]},
            "disclaimer": "Estimated visual expression morphology only; not internal emotional feelings."
        }

expression_detector = ExpressionDetector()
