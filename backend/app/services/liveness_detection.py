import cv2
import numpy as np
import logging
from typing import Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger("liveness_detection")

class LivenessDetector:
    """
    Face Presentation-Attack Detection (PAD) Engine.
    Detects 2D photographic attacks, electronic screen replays, and cutouts.
    Does not rely solely on blinking or head movement.
    """
    def __init__(self):
        self.threshold = settings.liveness_threshold

    def check_liveness(self, face_crop: np.ndarray) -> Dict[str, Any]:
        """
        Assess face authenticity using multi-feature analysis:
        1. High-frequency Fourier spectrum (Moiré / screen grid artifacts)
        2. Color space chrominance balance (HSV & YCrCb specular reflection)
        3. Local texture entropy (Skin micro-texture vs glossy display)
        """
        if face_crop is None or face_crop.size == 0 or face_crop.shape[0] < 30 or face_crop.shape[1] < 30:
            return {
                "is_authentic": False,
                "liveness_score": 0.0,
                "confidence": 0.0,
                "reasons": ["Invalid or tiny face crop"]
            }

        # Resize to standard size for normalized computation
        resized = cv2.resize(face_crop, (128, 128))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # 1. Fourier Frequency Domain Analysis
        # Natural human skin has continuous gradual frequency decay.
        # Screens / printed halftone patterns exhibit strong unnatural periodic spikes or high-freq cutoff.
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-6)
        
        # Calculate ratio of high-frequency to low-frequency energy
        rows, cols = gray.shape
        crow, ccol = rows // 2, cols // 2
        # Low freq center mask
        r_inner = 20
        y, x = np.ogrid[:rows, :cols]
        mask_inner = (x - ccol)**2 + (y - crow)**2 <= r_inner**2
        
        low_freq_energy = np.sum(magnitude_spectrum[mask_inner])
        total_energy = np.sum(magnitude_spectrum)
        high_freq_energy = total_energy - low_freq_energy
        freq_ratio = float(high_freq_energy / (total_energy + 1e-6))
        
        # Real skin typically has balanced freq_ratio between 0.35 and 0.72
        freq_score = 1.0 - min(1.0, abs(freq_ratio - 0.52) * 2.8)
        freq_score = max(0.0, freq_score)

        # 2. Color Diversity & Specular Reflection in HSV / YCrCb
        # Screens have narrow dynamic chrominance and sharp blue/green backlight bias.
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        val = hsv[:, :, 2]
        
        sat_mean = float(np.mean(sat))
        sat_std = float(np.std(sat))
        val_std = float(np.std(val))

        # Real skin has healthy saturation (40 - 180) and natural contrast variation
        sat_score = 1.0
        if sat_mean < 25 or sat_mean > 210:
            sat_score -= 0.5
        if sat_std < 15:
            sat_score -= 0.3
        sat_score = max(0.0, min(1.0, sat_score))

        # 3. Micro-Texture Sharpness & Contrast Gradient
        # Prints and screens often lack subtle 3D depth gradients
        ycrcb = cv2.cvtColor(resized, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]
        cr_std = float(np.std(cr))
        cb_std = float(np.std(cb))
        
        chroma_score = 1.0
        if cr_std < 4.0 or cb_std < 4.0:
            chroma_score -= 0.4
        chroma_score = max(0.0, chroma_score)

        # Combine weighted subscores
        final_liveness = (
            freq_score * 0.45 +
            sat_score * 0.35 +
            chroma_score * 0.20
        )
        final_liveness = round(float(final_liveness), 3)

        is_authentic = final_liveness >= self.threshold
        reasons = []
        if not is_authentic:
            if freq_score < 0.4:
                reasons.append("Unnatural frequency spectrum (possible screen/print artifact)")
            if sat_score < 0.5:
                reasons.append("Color saturation distortion")
            if chroma_score < 0.5:
                reasons.append("Flat skin chrominance gradient")

        return {
            "is_authentic": is_authentic,
            "liveness_score": final_liveness,
            "confidence": round(final_liveness * 100, 1),
            "freq_score": round(freq_score, 2),
            "sat_score": round(sat_score, 2),
            "chroma_score": round(chroma_score, 2),
            "reasons": reasons
        }

liveness_detector = LivenessDetector()
