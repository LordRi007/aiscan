import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.person import Person
from app.models.face_embedding import FaceEmbedding
from app.services.registration_manager import registration_manager
from app.config import encrypt_embedding, decrypt_embedding

def test_registration_and_gdpr_deletion():
    """Verify atomic registration transaction, encryption, and deletion."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    dummy_snapshot = np.ones((100, 100, 3), dtype=np.uint8) * 128
    dummy_emb = np.random.randn(128).astype(np.float32)
    dummy_emb = dummy_emb / np.linalg.norm(dummy_emb)

    # 1. Register
    success, info, err = registration_manager.register_new_person(
        db=db,
        snapshot_img=dummy_snapshot,
        embedding=dummy_emb,
        initial_expression="Happy",
        expression_confidence=91.0,
        name="Test Subject"
    )
    assert success is True
    assert info is not None
    assert info["person_code"].startswith("FACE-")
    person_id = info["person_id"]

    # 2. Check encryption in DB
    emb_record = db.query(FaceEmbedding).filter(FaceEmbedding.person_id == person_id).first()
    assert emb_record is not None
    decrypted = decrypt_embedding(emb_record.encrypted_embedding)
    restored_emb = np.frombuffer(decrypted, dtype=np.float32)
    assert np.allclose(dummy_emb, restored_emb)

    # 3. GDPR Delete
    del_success = registration_manager.delete_person(db, person_id)
    assert del_success is True
    assert db.query(Person).filter(Person.id == person_id).first() is None
    assert db.query(FaceEmbedding).filter(FaceEmbedding.person_id == person_id).first() is None

    db.close()
