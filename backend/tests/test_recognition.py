import numpy as np
from app.services.face_recognition import face_recognition_engine

def test_embedding_extraction_and_normalization():
    """Verify that extracted embeddings have unit L2 norm."""
    dummy_face = np.random.randint(0, 255, (112, 112, 3), dtype=np.uint8)
    emb = face_recognition_engine.extract_embedding(dummy_face)
    assert len(emb) == 128
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-4

def test_similarity_calibration():
    """Verify that identical embeddings score 1.0 and orthogonal embeddings score ~0.0."""
    v1 = np.random.randn(128).astype(np.float32)
    v1 = v1 / np.linalg.norm(v1)

    # Identical vector
    sim_identical = face_recognition_engine.compute_similarity(v1, v1)
    assert abs(sim_identical - 1.0) < 1e-5

    # Candidate search
    candidates = [
        {"person_id": 1, "person_code": "FACE-000001", "name": "Alice", "embedding": v1}
    ]
    res = face_recognition_engine.search_candidates(v1, candidates)
    assert res["decision"] == "MATCH"
    assert res["best_match"]["person_code"] == "FACE-000001"

    # Completely different vector
    v_diff = np.random.randn(128).astype(np.float32)
    v_diff = v_diff / np.linalg.norm(v_diff)
    res_diff = face_recognition_engine.search_candidates(v_diff, candidates)
    assert res_diff["decision"] in ["NEW_IDENTITY", "UNCERTAIN"]
