from sqlalchemy.orm import Session

from models.enums import Grade
from models.grade_band import GradeBand


def score_to_grade(db: Session, score: int) -> Grade | None:
    band = (
        db.query(GradeBand)
        .filter(GradeBand.min_score <= score, GradeBand.max_score >= score)
        .first()
    )
    return band.grade if band else None
