from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.permission import Permission
from models.role_permission import RolePermission
from schemas.role_permission import RolePermissionCreate, RolePermissionOut
from services.security import require_permission

router = APIRouter(prefix="/role-permissions", tags=["role-permissions"])


@router.post(
    "",
    response_model=RolePermissionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("permissions", Action.CREATE))],
)
def grant_permission(grant_in: RolePermissionCreate, db: Session = Depends(get_db)):
    if db.get(Permission, grant_in.permission_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    grant = RolePermission(**grant_in.model_dump())
    db.add(grant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This role already has this permission",
        )
    db.refresh(grant)
    return grant


@router.get(
    "",
    response_model=list[RolePermissionOut],
    dependencies=[Depends(require_permission("permissions", Action.READ))],
)
def list_grants(db: Session = Depends(get_db)):
    return db.query(RolePermission).order_by(RolePermission.role).all()


@router.delete(
    "/{grant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("permissions", Action.DELETE))],
)
def revoke_permission(grant_id: int, db: Session = Depends(get_db)):
    grant = db.get(RolePermission, grant_id)
    if grant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found",
        )
    db.delete(grant)
    db.commit()
