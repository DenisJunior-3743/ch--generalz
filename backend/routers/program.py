from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.faculty import Faculty
from models.program import Program
from schemas.program import ProgramCreate, ProgramOut, ProgramUpdate
from services.security import require_permission

router = APIRouter(prefix="/programs", tags=["programs"])


@router.post(
    "",
    response_model=ProgramOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("programs", Action.CREATE))],
)
def create_program(program_in: ProgramCreate, db: Session = Depends(get_db)):
    if db.get(Faculty, program_in.faculty_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    program = Program(**program_in.model_dump())
    db.add(program)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Program code already exists",
        )
    db.refresh(program)
    return program


@router.get(
    "",
    response_model=list[ProgramOut],
    dependencies=[Depends(require_permission("programs", Action.READ))],
)
def list_programs(faculty_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Program)
    if faculty_id is not None:
        query = query.filter(Program.faculty_id == faculty_id)
    return query.order_by(Program.name).all()


def _get_program_or_404(program_id: int, db: Session) -> Program:
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found",
        )
    return program


@router.put(
    "/{program_id}",
    response_model=ProgramOut,
    dependencies=[Depends(require_permission("programs", Action.UPDATE))],
)
def replace_program(program_id: int, program_in: ProgramCreate, db: Session = Depends(get_db)):
    program = _get_program_or_404(program_id, db)
    if db.get(Faculty, program_in.faculty_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    program.code = program_in.code
    program.name = program_in.name
    program.faculty_id = program_in.faculty_id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Program code already exists",
        )
    db.refresh(program)
    return program


@router.patch(
    "/{program_id}",
    response_model=ProgramOut,
    dependencies=[Depends(require_permission("programs", Action.UPDATE))],
)
def update_program(program_id: int, program_in: ProgramUpdate, db: Session = Depends(get_db)):
    program = _get_program_or_404(program_id, db)
    updates = program_in.model_dump(exclude_unset=True)

    if "faculty_id" in updates and db.get(Faculty, updates["faculty_id"]) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    for field, value in updates.items():
        setattr(program, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Program code already exists",
        )
    db.refresh(program)
    return program


@router.delete(
    "/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("programs", Action.DELETE))],
)
def delete_program(program_id: int, db: Session = Depends(get_db)):
    program = _get_program_or_404(program_id, db)
    db.delete(program)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this program — one or more students are enrolled in it",
        )
