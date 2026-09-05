from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.permission import Permission
from schemas.permission import PermissionCreate, PermissionOut
from services.security import require_permission

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.post(
    "",
    response_model=PermissionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("permissions", Action.CREATE))],
)
def create_permission(permission_in: PermissionCreate, db: Session = Depends(get_db)):
    permission = Permission(**permission_in.model_dump())
    db.add(permission)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This module/action permission already exists",
        )
    db.refresh(permission)
    return permission


@router.get(
    "",
    response_model=list[PermissionOut],
    dependencies=[Depends(require_permission("permissions", Action.READ))],
)
def list_permissions(db: Session = Depends(get_db)):
    return db.query(Permission).order_by(Permission.module, Permission.action).all()
