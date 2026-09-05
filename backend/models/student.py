from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Gender


class Student(Base):
    __tablename__ = "students"

    reg_number = Column(String(30), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    gender = Column(SQLEnum(Gender), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    intake_year = Column(Integer, nullable=False)
