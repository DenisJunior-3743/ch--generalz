from sqlalchemy import Column, Integer, String
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Gender


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    gender = Column(SQLEnum(Gender), nullable=False)
