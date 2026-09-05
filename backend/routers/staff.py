from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.staff import Staff
from schemas.staff import StaffCreate, StaffOut, StaffPage, StaffUpdate
from services.security import require_permission

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post(
    "",
    response_model=StaffOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("staff", Action.CREATE))],
)
def create_staff(staff_in: StaffCreate, db: Session = Depends(get_db)):
    staff = Staff(**staff_in.model_dump())
    db.add(staff)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    db.refresh(staff)
    return staff


@router.get(
    "",
    response_model=StaffPage,
    dependencies=[Depends(require_permission("staff", Action.READ))],
)
def list_staff(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(Staff).count()
    items = (
        db.query(Staff)
        .order_by(Staff.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return StaffPage(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{staff_id}",
    response_model=StaffOut,
    dependencies=[Depends(require_permission("staff", Action.READ))],
)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff not found",
        )
    return staff


def _get_staff_or_404(staff_id: int, db: Session) -> Staff:
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff not found",
        )
    return staff


@router.put(
    "/{staff_id}",
    response_model=StaffOut,
    dependencies=[Depends(require_permission("staff", Action.UPDATE))],
)
def replace_staff(staff_id: int, staff_in: StaffCreate, db: Session = Depends(get_db)):
    staff = _get_staff_or_404(staff_id, db)
    for field, value in staff_in.model_dump().items():
        setattr(staff, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    db.refresh(staff)
    return staff


@router.patch(
    "/{staff_id}",
    response_model=StaffOut,
    dependencies=[Depends(require_permission("staff", Action.UPDATE))],
)
def update_staff(staff_id: int, staff_in: StaffUpdate, db: Session = Depends(get_db)):
    staff = _get_staff_or_404(staff_id, db)
    for field, value in staff_in.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    db.refresh(staff)
    return staff


@router.delete(
    "/{staff_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("staff", Action.DELETE))],
)
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = _get_staff_or_404(staff_id, db)
    db.delete(staff)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this staff member — they still have a login account (delete the user account first)",
        )
