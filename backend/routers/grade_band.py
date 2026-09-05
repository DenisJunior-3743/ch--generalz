from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.grade_band import GradeBand
from schemas.grade_band import GradeBandCreate, GradeBandOut, GradeBandUpdate
from services.security import require_permission

router = APIRouter(prefix="/grade-bands", tags=["grade-bands"])


@router.post(
    "",
    response_model=GradeBandOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("grade_bands", Action.CREATE))],
)
def create_grade_band(band_in: GradeBandCreate, db: Session = Depends(get_db)):
    overlapping = (
        db.query(GradeBand)
        .filter(
            GradeBand.min_score <= band_in.max_score,
            GradeBand.max_score >= band_in.min_score,
        )
        .first()
    )
    if overlapping is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Score range overlaps existing band '{overlapping.grade.value}' "
                f"({overlapping.min_score}-{overlapping.max_score})"
            ),
        )

    band = GradeBand(**band_in.model_dump())
    db.add(band)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A grade band for this grade already exists",
        )
    db.refresh(band)
    return band


@router.get(
    "",
    response_model=list[GradeBandOut],
    dependencies=[Depends(require_permission("grade_bands", Action.READ))],
)
def list_grade_bands(db: Session = Depends(get_db)):
    return db.query(GradeBand).order_by(GradeBand.min_score).all()


def _get_band_or_404(band_id: int, db: Session) -> GradeBand:
    band = db.get(GradeBand, band_id)
    if band is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade band not found",
        )
    return band


def _check_no_overlap(db: Session, band_id: int, min_score: int, max_score: int) -> None:
    overlapping = (
        db.query(GradeBand)
        .filter(
            GradeBand.id != band_id,
            GradeBand.min_score <= max_score,
            GradeBand.max_score >= min_score,
        )
        .first()
    )
    if overlapping is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Score range overlaps existing band '{overlapping.grade.value}' "
                f"({overlapping.min_score}-{overlapping.max_score})"
            ),
        )


@router.put(
    "/{band_id}",
    response_model=GradeBandOut,
    dependencies=[Depends(require_permission("grade_bands", Action.UPDATE))],
)
def replace_grade_band(band_id: int, band_in: GradeBandCreate, db: Session = Depends(get_db)):
    band = _get_band_or_404(band_id, db)
    _check_no_overlap(db, band_id, band_in.min_score, band_in.max_score)

    band.min_score = band_in.min_score
    band.max_score = band_in.max_score
    band.grade = band_in.grade
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A grade band for this grade already exists",
        )
    db.refresh(band)
    return band


@router.patch(
    "/{band_id}",
    response_model=GradeBandOut,
    dependencies=[Depends(require_permission("grade_bands", Action.UPDATE))],
)
def update_grade_band(band_id: int, band_in: GradeBandUpdate, db: Session = Depends(get_db)):
    band = _get_band_or_404(band_id, db)
    updates = band_in.model_dump(exclude_unset=True)

    effective_min = updates.get("min_score", band.min_score)
    effective_max = updates.get("max_score", band.max_score)
    if effective_min > effective_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_score must be less than or equal to max_score",
        )
    _check_no_overlap(db, band_id, effective_min, effective_max)

    for field, value in updates.items():
        setattr(band, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A grade band for this grade already exists",
        )
    db.refresh(band)
    return band


@router.delete(
    "/{band_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("grade_bands", Action.DELETE))],
)
def delete_grade_band(band_id: int, db: Session = Depends(get_db)):
    band = _get_band_or_404(band_id, db)
    db.delete(band)
    db.commit()
