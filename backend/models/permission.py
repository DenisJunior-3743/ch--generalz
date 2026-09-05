from sqlalchemy import Column, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Action


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("module", "action", name="uq_module_action"),
    )

    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(50), nullable=False)
    action = Column(SQLEnum(Action), nullable=False)
