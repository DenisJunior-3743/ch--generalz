from enum import Enum


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Term(str, Enum):
    SEM_1 = "sem_1"
    SEM_2 = "sem_2"


class Grade(str, Enum):
    A = "A"
    B_PLUS = "B+"
    B = "B"
    C_PLUS = "C+"
    C = "C"
    D_PLUS = "D+"
    D = "D"
    F = "F"


class Role(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    STUDENT = "student"


class Action(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
