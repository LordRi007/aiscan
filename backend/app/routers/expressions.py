from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from app.database import get_db
from app.models.expression_observation import ExpressionObservation
from app.services.face_tracker import face_tracker

router = APIRouter(prefix="/expressions", tags=["Expressions"])

@router.get("/current")
def get_current_expressions():
    """Retrieve expressions of all people currently detected in front of camera."""
    tracks = face_tracker.get_all_active_tracks()
    return {
        "active_faces": [
            {
                "track_id": t.track_id,
                "person_id": t.person_id,
                "person_name": t.person_name,
                "expression": t.expression,
                "confidence": t.expression_confidence
            }
            for t in tracks if t.missed_frames == 0
        ],
        "disclaimer": "Estimated visual expression morphology only; not internal emotional state."
    }

@router.get("/statistics")
def get_expression_statistics(db: Session = Depends(get_db)):
    """Aggregate breakdown of expression observation categories."""
    results = (
        db.query(ExpressionObservation.expression_category, func.count(ExpressionObservation.id))
        .group_by(ExpressionObservation.expression_category)
        .all()
    )

    stats = {cat: count for cat, count in results}
    all_categories = ["Happy", "Neutral", "Sad", "Surprised", "Angry", "Fearful", "Disgusted", "Uncertain"]
    for cat in all_categories:
        if cat not in stats:
            stats[cat] = 0

    return {
        "distribution": stats,
        "total_observations": sum(stats.values()),
        "disclaimer": "Tentative visual categories only; not emotional measurements."
    }

@router.get("/history")
def get_expression_history(limit: int = 50, db: Session = Depends(get_db)):
    """Chronological log of recent expression observations."""
    records = (
        db.query(ExpressionObservation)
        .order_by(ExpressionObservation.observed_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "person_id": r.person_id,
            "expression": r.expression_category,
            "confidence": r.model_confidence,
            "observed_at": r.observed_at.isoformat() if r.observed_at else None
        }
        for r in records
    ]
