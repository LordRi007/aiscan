import os
from pathlib import Path
from pydantic import BaseModel
from cryptography.fernet import Fernet
import base64
import hashlib

BASE_DIR = Path(__file__).resolve().parent.parent
PROTECTED_STORAGE_DIR = BASE_DIR / "protected_storage" / "faces"
PROTECTED_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "Facial Recognition & Mood Analytics System"
    api_prefix: str = "/api"
    database_url: str = f"sqlite:///{BASE_DIR / 'facial_recognition.db'}"
    protected_storage_dir: Path = PROTECTED_STORAGE_DIR
    
    # Camera settings
    # Default to external camera index (1) or IP stream; built-in camera is 0
    default_external_camera_index: int = 1
    builtin_camera_index: int = 0
    frame_width: int = 1280
    frame_height: int = 720
    target_fps: int = 30
    
    # Face Quality Settings
    min_face_size: int = 45
    min_sharpness: float = 30.0  # Laplacian variance
    min_brightness: float = 40.0
    max_brightness: float = 230.0
    min_contrast: float = 25.0
    
    # Presentation-Attack / Liveness
    liveness_threshold: float = 0.50
    
    # Identity Verification & Similarity (Cosine similarity)
    # 0.72+ -> Confident Existing Person match
    # 0.58 - 0.72 -> Ambiguous/Uncertain Match (Needs manual review)
    # < 0.58 -> Potentially New Person
    similarity_match_threshold: float = 0.72
    similarity_uncertain_threshold: float = 0.58
    
    # Verification Engine
    min_verification_frames: int = 6  # consecutive stable frames required
    max_simultaneous_faces: int = 10
    
    # Policies
    require_explicit_consent: bool = False
    auto_register_verified_new: bool = True
    enable_expression_analysis: bool = True
    
    # Encryption key for face biometric embeddings
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")

settings = Settings()

# Setup encryption suite
def get_cipher():
    raw_key = settings.encryption_key or "biometric-encryption-secret-salt-2026-safe-protect"
    # Derive deterministic 32-byte url-safe key
    key_bytes = hashlib.sha256(raw_key.encode('utf-8')).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

cipher_suite = get_cipher()

def encrypt_embedding(embedding_bytes: bytes) -> bytes:
    return cipher_suite.encrypt(embedding_bytes)

def decrypt_embedding(encrypted_bytes: bytes) -> bytes:
    return cipher_suite.decrypt(encrypted_bytes)
