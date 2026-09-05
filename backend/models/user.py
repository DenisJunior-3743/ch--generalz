from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Role


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(Role), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), unique=True, nullable=True)
    student_reg_number = Column(String(30), ForeignKey("students.reg_number"), unique=True, nullable=True)
    photo_url = Column(String(500), nullable=True)
    photo_file_id = Column(String(24), nullable=True)
