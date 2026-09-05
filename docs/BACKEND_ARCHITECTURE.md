# Backend Architecture — How the Code Is Organized

This documents the actual code structure we've built so far — through
Phase 8 of [TEAM_ROADMAP.md](TEAM_ROADMAP.md), the final phase — what
each folder is for, what each file does, and how a request actually
flows through all of them. For environment setup (Docker, Postgres,
venv) see [SETUP_GUIDE.md](SETUP_GUIDE.md) instead — this doc is about
the code itself.

It grows one section per phase as new entities land.

---

## 1. The four layers, and why they're separate folders

```
routers/    <- "what URL, what HTTP method, what status code"
schemas/    <- "what shape of data is this endpoint allowed to receive/send"
models/     <- "what does this look like as a database table"
services/   <- (not used yet) "the actual business logic/rules"
database.py <- "how do we even talk to the database" (shared by everything)
```

A request travels through these layers **in order**, and each layer only
knows about the one below it — a router never touches SQL directly, and a
model never knows anything about HTTP. That isolation is the literal
meaning of "a bug in one module can't break another": `routers/staff.py`
importing something broken doesn't touch `routers/health.py` at all,
because they're separate files that only get connected in `main.py`.

---

## 2. `main.py` — assembles the app, nothing else

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import course, faculty, health, staff

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(staff.router)
app.include_router(faculty.router)
app.include_router(course.router)
```

- `Base.metadata.create_all(bind=engine)` — looks at every model class
  that inherits from `Base` (currently `Staff`, `Faculty`, `Course`) and
  creates its table in Postgres if it doesn't already exist. This only
  ever *adds missing tables* — it never alters a table that already
  exists, which is why we'll eventually replace this with **Alembic** (a
  migration tool) once we start changing columns on tables that already
  have real data in them.
- `CORSMiddleware` — added once the frontend needed to actually call this
  API from a browser (a different origin, `localhost:5173`, than the API
  itself). Without it, the browser blocks the response before frontend
  code ever sees it — this is a browser-enforced rule, unrelated to
  anything Postman or a native mobile app does, which is why neither of
  those ever needed it.
- `app.include_router(...)` — this is the entire "registration" step for
  a module. Adding a new entity to the API is always: write its router,
  then add one line here. `main.py` should never grow much past this.

---

## 3. `database.py` — the shared connection (recap)

Already covered in detail in [SETUP_GUIDE.md](SETUP_GUIDE.md) §6. The
short version: `engine` is the connection to Postgres, `SessionLocal`
creates one session per request, `get_db()` is the FastAPI dependency
every router uses to get that session, and `Base` is the class every
SQLAlchemy model inherits from.

---

## 4. `models/` — the database shape

### `models/enums.py`

```python
from enum import Enum

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
```

A **fixed set of valid values**, defined once. Lives in its own file
(not inside `staff.py`) because it isn't staff-specific — `Student` will
use this exact same `Gender` enum in Phase 6. Any future fixed-choice
field (e.g. `Term` in Phase 7) goes here too.

### `models/staff.py`

```python
class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    gender = Column(SQLEnum(Gender), nullable=False)
```

This class **is** the `staff` table — each `Column(...)` is a column.
Notable choices:
- `email` has `unique=True` — Postgres itself will refuse a second row
  with the same email, which is what makes the `409 Conflict` behavior in
  the router possible (see §6).
- `gender` uses `SQLEnum(Gender)` — Postgres enforces it's one of exactly
  `male`/`female`/`other`, at the database level, not just in our Python
  code.
- `index=True` on `id` and `email` — speeds up lookups by those columns
  (which is exactly how we query: by id in `GET /staff/{id}`, and
  implicitly by email when checking uniqueness).

A `models/*.py` file only ever describes structure — it has no functions,
no validation logic, no HTTP awareness at all.

---

## 5. `schemas/` — what the API is allowed to send and receive

### `schemas/staff.py`

```python
class StaffCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender

class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender
```

Two schemas that look almost identical right now, but serve opposite
directions and will diverge soon:

- **`StaffCreate`** — validates *incoming* data on `POST /staff`. No
  `id` field, because the client doesn't get to choose it (the database
  assigns it). `EmailStr` specifically checks it's a well-formed email
  address, not just any string — that's the whole reason the earlier
  `422` test (`email: "not-an-email"`) failed correctly.
- **`StaffOut`** — shapes *outgoing* data. Has `id` because the response
  needs to include it. `model_config = ConfigDict(from_attributes=True)`
  is what lets FastAPI build this schema directly from a SQLAlchemy
  `Staff` object's attributes (`staff.id`, `staff.email`, ...) instead of
  requiring a dict.

The split matters more the moment we add `password_hash` in Phase 9: it
belongs on `StaffCreate` (client sets it) and on the `Staff` model (it's
stored), but **never** on `StaffOut` — so it's structurally impossible
for a password hash to leak into an API response, regardless of what the
router code does.

`schemas/` also means the outside world's contract (what JSON shape
`/docs` promises) is decoupled from the database's internal shape — you
could rename a database column without changing the API, or vice versa.

---

## 6. `routers/` — the actual endpoints

### `routers/health.py`

Two trivial routes (`/health`, `/db-check`) that don't touch a model or
schema at all — they exist purely to prove the server, and separately the
database connection, are alive. Good first thing to hit when something's
broken: if `/health` fails, the server itself isn't running; if `/health`
works but `/db-check` doesn't, the problem is specifically the database
connection.

### `routers/staff.py`

```python
router = APIRouter(prefix="/staff", tags=["staff"])

@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(staff_in: StaffCreate, db: Session = Depends(get_db)):
    staff = Staff(**staff_in.model_dump())
    db.add(staff)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    db.refresh(staff)
    return staff

@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
    return staff
```

Line by line, what's actually happening:

- `APIRouter(prefix="/staff", tags=["staff"])` — every route defined
  below is automatically prefixed with `/staff` (so `@router.post("")`
  really means `POST /staff`), and `tags` groups them together under a
  "staff" heading in `/docs`.
- `staff_in: StaffCreate` — FastAPI reads the request body, and it *has*
  to match `StaffCreate`'s shape or the request never even reaches this
  function — it gets rejected with `422` automatically, before your code
  runs at all.
- `db: Session = Depends(get_db)` — dependency injection again: FastAPI
  calls `get_db()`, hands this function the session, closes it after.
- `Staff(**staff_in.model_dump())` — converts the validated Pydantic
  object into a SQLAlchemy `Staff` instance (unpacking its fields as
  keyword arguments).
- `db.add(staff)` then `db.commit()` — stages the insert, then actually
  writes it to Postgres. If the email's `unique=True` constraint is
  violated, Postgres rejects the write and SQLAlchemy raises
  `IntegrityError` — caught explicitly, rolled back (so the session isn't
  left in a broken half-committed state), and turned into a clean `409`
  the client can understand — instead of leaking a raw database error.
- `db.refresh(staff)` — after commit, re-reads the row from the DB so
  `staff.id` (assigned by Postgres) is populated on the Python object
  before we return it.
- `response_model=StaffOut` — FastAPI takes whatever `create_staff`
  returns (a full `Staff` model instance) and filters it through
  `StaffOut` before sending it as JSON — this is the enforcement point for
  the "never leak fields we didn't mean to" guarantee described in §5.
- `db.get(Staff, staff_id)` — a primary-key lookup; returns `None` if
  nothing matches, which is deliberately turned into a `404` rather than
  letting a `None` flow further and cause a confusing `500` later.

---

## 7. Full request trace: `POST /staff` with a duplicate email

Useful to trace once end to end, since every future entity repeats this
exact shape:

1. Client sends `POST /staff` with a JSON body.
2. FastAPI matches the route in `routers/staff.py` (registered via
   `main.py`'s `include_router`).
3. The body is validated against `StaffCreate` (`schemas/staff.py`). If
   the email isn't a valid email shape or gender isn't one of the enum
   values, this step fails and the client gets `422` — `create_staff`'s
   body never even runs.
4. `get_db()` (`database.py`) hands the route a database session.
5. A `Staff` object (`models/staff.py`) is built and staged for insert.
6. `db.commit()` sends the actual `INSERT` to Postgres. Postgres checks
   the `unique=True` constraint on `email` and rejects it.
7. SQLAlchemy raises `IntegrityError`; the router catches it, rolls back,
   raises `HTTPException(409, ...)`.
8. FastAPI turns that exception into an HTTP `409` response with a JSON
   error body — the client never sees a raw database error message.

Swap step 6/7 for success, and the last step instead runs the response
through `StaffOut` (§5) and returns `201`.

---

## 8. `services/` — currently empty, here's why it exists already

No file in it yet, because `create_staff`'s logic is still simple enough
to live directly in the router. It becomes necessary the moment route
logic needs to do more than one database operation, or the same logic
needs to be reused from two different routers — e.g. Phase 6's student
registration wizard, or Phase 7's marks batch-insert-with-transaction.
At that point, the pattern becomes: router receives/validates the
request → calls a function in `services/` → service does the actual
multi-step database work → router turns the result into a response.
Keeping the folder scaffolded now means we won't need to restructure
later, just add files into it.

---

## 9. Phase 3 — Faculty & Program (admin-managed metadata, the selector pattern)

Two new entities, same four-layer shape as Staff, plus one new thing:
**a foreign key between them**, and what happens when it's invalid.

*(Naming note: this section originally called the degree entity
`Course`. It's `Program` now — see the correction in
[TEAM_ROADMAP.md](TEAM_ROADMAP.md) §2. `Course` was reassigned to mean
an individual course unit instead, covered in §11.)*

### `models/faculty.py` and `models/program.py`

```python
class Faculty(Base):
    __tablename__ = "faculties"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)

class Program(Base):
    __tablename__ = "programs"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
```

`ForeignKey("faculties.id")` — this is what makes the relationship real
at the database level, not just "these two tables happen to share a
naming convention." Postgres itself will refuse to insert a `Program` row
whose `faculty_id` doesn't match an existing `Faculty.id` — a second,
database-level backstop underneath the explicit check the router does
first (see below). `SQLAlchemy` sorts out that `faculties` must be
created before `programs` automatically when `Base.metadata.create_all()`
runs, because of this declared dependency — no manual ordering needed.

### `schemas/faculty.py` and `schemas/program.py`

Same `Create`/`Out` split as Staff (§5) — nothing new conceptually.
`ProgramCreate` includes `faculty_id: int`, since the client has to say
which faculty a program belongs to when creating one.

### `routers/program.py` — validating a foreign key *before* touching the database

```python
@router.post("", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
def create_program(program_in: ProgramCreate, db: Session = Depends(get_db)):
    if db.get(Faculty, program_in.faculty_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty not found")

    program = Program(**program_in.model_dump())
    db.add(program)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Program code already exists")
    db.refresh(program)
    return program
```

The `db.get(Faculty, ...)` check at the top is new — it's an explicit,
readable `404` for "this faculty doesn't exist," done *before* attempting
the insert. Postgres's own foreign-key constraint would also reject an
insert with a bad `faculty_id`, but that failure would surface as a
generic `IntegrityError` indistinguishable from the "duplicate code"
case already being handled below it — checking explicitly first means
the client gets an accurate, specific error (`404` "not found" vs. `409`
"conflict") instead of one catch-all failure meaning two different
things.

### `routers/faculty.py` and `routers/program.py` — the `GET` (selector) endpoints

```python
@router.get("", response_model=list[FacultyOut])
def list_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).order_by(Faculty.name).all()

@router.get("", response_model=list[ProgramOut])
def list_programs(faculty_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Program)
    if faculty_id is not None:
        query = query.filter(Program.faculty_id == faculty_id)
    return query.order_by(Program.name).all()
```

Deliberately **no pagination** here, unlike `GET /staff`. Faculty and
Program are small reference lists meant to populate a dropdown in one
shot — a UI can't build a `<select>` incrementally across pages the way
it can page through a table. Pagination is a "this list could be huge"
tool; these lists, by design, stay small.

`faculty_id: int | None = None` on `list_programs` is what makes
`GET /programs?faculty_id=1` filter and plain `GET /programs` return
everything — an optional query parameter with a default of `None`, no
`Query(...)` constraints needed since there's nothing to validate here
(any integer or nothing at all is a valid ask).

### The Admin/Staff boundary — designed in, enforced since Phase 10

Both `POST /faculties` and `POST /programs` are, by design, meant to be
callable only by an Admin (see [TEAM_ROADMAP.md](TEAM_ROADMAP.md) §2) —
at the time this section was written there was no authentication yet
(Phase 9), so nothing stopped any caller from hitting them. That gap is
closed now: each route carries `dependencies=[Depends(require_permission("faculties", Action.CREATE))]`
(§15), and the seeded grant matrix gives that permission to `admin` only
— staff has `faculties:read` but not `faculties:create`, so the
boundary described here turned out to be exactly right, just enforced
through the dynamic permission system rather than a hardcoded
`require_role("admin")`. The `GET` routes stay open to both Staff and
Admin, since both need to read the catalog to populate selectors.

---

## 10. Phase 6 — Student registration (one entity, three foreign-key-shaped lessons)

`models/student.py`, `schemas/student.py`, `routers/student.py` follow
the exact same four-layer shape as everything before them. What's new
here isn't the pattern — it's three specific things that only show up
once a resource has *both* a non-integer primary key *and* two foreign
keys that need to agree with each other.

### The primary key is a string, and that broke a route — a real bug we hit live

```python
class Student(Base):
    __tablename__ = "students"
    reg_number = Column(String(30), primary_key=True)
    ...
```

The very first test — creating a student with `reg_number =
"FCI/BSE/2026/0001"` — succeeded (`201`), but `GET
/students/FCI/BSE/2026/0001` came back `404` even though the row
existed (confirmed via the list endpoint). The cause: a route like
`@router.get("/{reg_number}")` matches exactly **one URL path segment**.
A `/` inside the value gets read by the router as *another* path segment
boundary, not as literal data — so `/students/FCI/BSE/2026/0001` looks
like five segments to the router, not "`students` + one `reg_number`."

This is exactly the kind of thing an auto-increment integer `id` sidesteps
for free (an integer can never contain a `/`), and it's a concrete
instance of the natural-key trade-off flagged back in
[TEAM_ROADMAP.md](TEAM_ROADMAP.md) §2. The fix wasn't code — it was a
**format rule**: reg_numbers use `-` instead of `/` as their separator
(`FCI-BSE-2026-0001`), enforced by the frontend's Bio Data form
validation, since the backend has no way to "fix" a value the client
already chose to send. Worth remembering any time a primary key is a
human-chosen string rather than a database-assigned integer.

### Two foreign keys, and validating that they actually agree

```python
faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
```

*(This originally read `course_id` → `ForeignKey("courses.id")`, back
when `Course` meant the degree entity. Renamed to `Program` — see §9.)*

Each FK on its own only proves "this id exists in that table." It says
nothing about whether the *pair* makes sense together — a request could
send a real `faculty_id` and a real `program_id` that belongs to a
*different* faculty entirely. The router checks this explicitly:

```python
program = db.get(Program, student_in.program_id)
if program.faculty_id != student_in.faculty_id:
    raise HTTPException(status_code=422, detail="Selected program does not belong to the selected faculty")
```

`422`, not `404` or `409` — the individual ids are both perfectly valid
(so it's not "not found"), and it's not a uniqueness clash (so it's not
"conflict") — it's that the *combination* violates a rule about how the
data relates, which is exactly what `422 Unprocessable Entity` means: the
request is well-formed and each piece is individually valid, but the
whole doesn't make sense together.

### One POST instead of POST-then-PATCH

The original plan (see [TEAM_ROADMAP.md](TEAM_ROADMAP.md) §3, Phase 6)
had bio data and university info as two separate requests — a `POST`
then a `PATCH`. Since the team is deliberately holding off on PATCH/PUT/
DELETE as their own later phase, this became a single `POST /students`
carrying every field at once, with the two-screen wizard living entirely
in frontend state until one final submit. Same user-facing flow, one
fewer HTTP verb needed for now.

---

## 11. Phase 7 — Course & Mark (transactions, plus server-computed grades)

`models/course.py`, `schemas/course.py`, `routers/course.py` are a
straight copy of the Faculty pattern from §9 — same shape, same
admin-metadata caveat, nothing new. *(This entity was originally named
`Subject`; renamed to `Course` — "course unit" — per the correction in
[TEAM_ROADMAP.md](TEAM_ROADMAP.md) §2. The `Course` name freed up by that
same correction is now `Program`, from §9.)* The interesting parts are
`Mark` and the new `services/grading.py`.

### `services/grading.py` — the first thing to actually live in `services/`

*(Historical — this was the original version. It's since been rewritten
to look up an admin-managed `GradeBand` table instead of a hardcoded
scale; see §13 for the current implementation. Keeping this section as-is
because the reasoning below — why this logic belongs in `services/` at
all — still holds regardless of which version of the function it is.)*

```python
def score_to_grade(score: int) -> Grade:
    if score >= 80: return Grade.A
    if score >= 75: return Grade.B_PLUS
    if score >= 70: return Grade.B
    if score >= 65: return Grade.C_PLUS
    if score >= 60: return Grade.C
    if score >= 56: return Grade.D_PLUS
    if score >= 50: return Grade.D
    return Grade.F
```

§8 predicted `services/` would fill up "the moment route logic needs to
do more than one database operation, or the same logic needs to be
reused." This is actually a third reason, simpler than either: a pure
computation (score → grade) that has nothing to do with the database at
all, but doesn't belong inline in the router either — it's a business
rule (the grading scale) that deserves one obvious place to live and be
tested, independent of any HTTP concern. `score_to_grade` never touches
`db`, never raises an `HTTPException`; it just maps a number to a
`Grade`.

**Verified live, every boundary:** scores `0, 49, 50, 55, 56, 59, 60, 64,
65, 69, 70, 74, 75, 79, 80, 100` were submitted in one batch and every
single one came back with the exact grade the table in
[TEAM_ROADMAP.md](TEAM_ROADMAP.md) §2 specifies — both sides of every
threshold, which is exactly where an off-by-one in the `>=` comparisons
would have shown up if there was one.

### `models/semester.py` — a fourth admin-metadata entity, with a two-column uniqueness rule

```python
class Semester(Base):
    __tablename__ = "semesters"
    __table_args__ = (
        UniqueConstraint("academic_year", "term", name="uq_academic_year_term"),
    )
    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(20), nullable=False)
    term = Column(SQLEnum(Term), nullable=False)
```

Same admin-managed-catalog shape as `Faculty` (§9) — `routers/semester.py`
is a near-identical `POST`/`GET` pair. What's different is *why* this
entity exists at all rather than just putting a `semester` enum column
directly on `Mark` (the original design): a bare `sem_1`/`sem_2` value
can't distinguish this year's first semester from next year's. `Semester`
splits the concept into the part that's permanently two-valued (`term` —
kept as its own small enum, `Term`, since "first half of the year vs.
second half" really is fixed) and the part that grows every year
(`academic_year`, a plain string). `UniqueConstraint` on the pair stops
Admin from accidentally creating "2025/2026 Semester 1" twice — verified
live, `409` on the duplicate. `Mark` then references a specific
`Semester` row by id, same as it references a specific `Course` by id.

*(Naming note: the enum backing `term` used to be called `Semester`
too, back when there was no separate entity — renamed to `Term` to free
up the name for this table.)*

### `models/mark.py` — a uniqueness rule spanning three columns, plus a stored derived value

```python
class Mark(Base):
    __tablename__ = "marks"
    __table_args__ = (
        UniqueConstraint(
            "student_reg_number", "course_id", "semester_id",
            name="uq_student_course_semester",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    student_reg_number = Column(String(30), ForeignKey("students.reg_number"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    score = Column(Integer, nullable=False)
    grade = Column(SQLEnum(Grade), nullable=False)
```

Unlike `Staff.email` or `Faculty.code`, no single column here is unique
on its own — `UniqueConstraint` on the *combination* of three columns is
what encodes the actual rule: "a student can't have two marks for the
same course in the same semester." This existing at the database level
(not just something the router happens to check) is what made the
transaction test below possible. Note it's `semester_id` now, a foreign
key, not an inline enum — the `Semester` entity above is what made that
possible.

`grade` is stored, not computed on every read — it's set once, at
creation, from `score`. Since the mapping is a pure deterministic
function of `score`, storing the result is redundant in the strictest
sense (you could always recompute it from `score`), but it's the
standard trade-off for a value that's cheap to compute but read often:
compute once on write, read for free forever after.

### `schemas/mark.py` — two output shapes for the same row, on purpose

```python
class MarkOut(BaseModel):        # staff view
    id: int
    student_reg_number: str
    course_id: int
    score: int
    grade: Grade
    semester_id: int

class MarkStudentOut(BaseModel): # student view — no score field at all
    id: int
    course_id: int
    grade: Grade
    semester_id: int
```

This is the schema layer doing exactly the job described for it back in
§5: `MarkStudentOut` doesn't have a `score` field, which makes it
**structurally impossible** for a numeric score to end up in a response
built with it — not "the route chooses not to include it," but "the
type doesn't have anywhere to put it." Nothing currently returns
`MarkStudentOut` (there's no way yet to know a caller is a student — see
§9's Admin/Staff note, same story here), but it's ready for the moment
Phase 10 can make that call.

### `routers/mark.py` — validate everything, stage everything, commit once

```python
@router.post("/{reg_number}/marks", response_model=list[MarkOut], status_code=status.HTTP_201_CREATED)
def create_marks(reg_number: str, batch: MarksBatchCreate, db: Session = Depends(get_db)):
    if db.get(Student, reg_number) is None:
        raise HTTPException(status_code=404, detail="Student not found")

    for entry in batch.marks:
        if db.get(Course, entry.course_id) is None:
            raise HTTPException(status_code=404, detail=f"Course {entry.course_id} not found")
        if db.get(Semester, entry.semester_id) is None:
            raise HTTPException(status_code=404, detail=f"Semester {entry.semester_id} not found")

    marks = [
        Mark(
            student_reg_number=reg_number,
            course_id=entry.course_id,
            semester_id=entry.semester_id,
            score=entry.score,
            grade=score_to_grade(db, entry.score),  # see §13 — now a DB lookup, not a hardcoded chain
        )
        for entry in batch.marks
    ]
    db.add_all(marks)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="One or more marks duplicate an existing student/course/semester entry")
    for mark in marks:
        db.refresh(mark)
    return marks
```

Two separate failure-prevention mechanisms doing two different jobs:

1. **The `for entry in batch.marks` loop, before any `Mark` object is even
   built** — checks every `course_id` *and* `semester_id` in the batch
   exists, up front. This catches "obviously wrong" input (an id that
   doesn't exist at all) before touching the database with any inserts,
   and reports exactly which one was the problem.
2. **`db.add_all(marks)` followed by exactly one `db.commit()`** — this
   is the actual transaction. Every `Mark` in the batch is *staged* in
   the session but nothing is written to Postgres until `commit()` runs.
   If the database rejects *any* row (here: the `UniqueConstraint`),
   `commit()` raises `IntegrityError` for the whole call, and **none** of
   the batch's rows end up persisted — not even the ones that were
   individually fine. That's what "one database transaction" means in
   practice: the unit that succeeds or fails together is the whole
   `db.commit()` call, not each individual `db.add()`.

**Verified live:** a batch of `[new valid mark for a fresh course, duplicate
of an existing mark]` was submitted against a test student — response
was `409`, and a follow-up `GET .../marks` confirmed the new course's
mark was **not** saved, despite being perfectly valid on its own. If
instead each `Mark` had been individually `add()`-ed and `commit()`-ed in
its own loop iteration, the valid row *would* have been saved before the
bad one failed — a partially-applied batch, exactly the bug this design
avoids.

### `GET /students/{reg_number}/marks` — built ahead of schedule, on purpose

Not in the original Phase 7 plan, but added alongside the `POST` because
a staff user has no way to verify what they just entered without it. It
currently returns `MarkOut` (score + grade) unconditionally — there's no
auth yet to know the caller might be a student, so it can't yet decide
to send `MarkStudentOut` instead. It's not throwaway work regardless:
this is the exact query Phase 10's student-facing "My Marks" screen will
reuse later, just called with the logged-in student's own `reg_number`
instead of one a staff member typed in, and serialized through
`MarkStudentOut` instead of `MarkOut`.

---

## 12. A live schema-rename migration (why `ALTER TABLE` beat drop-and-recreate)

Renaming `Course`→`Program` and `Subject`→`Course` mid-project meant the
*database* had to catch up too — `Base.metadata.create_all()` (§2) only
ever creates tables that don't exist yet; it has no idea "the `courses`
table" and "the `programs` table" are related, let alone that one used
to mean what the other means now. Two options existed:

1. **Drop everything, recreate from the new models.** Simple, but
   destroys real data — at the time, `courses` (the old degree-programme
   table) held 4 real rows entered by hand (`BCS`, `BSE`, `CVE`, `EEE`),
   and `students` had one real registered student referencing one of
   them.
2. **Rename in place with `ALTER TABLE`/`ALTER SEQUENCE`.** Postgres
   tracks tables, columns, and foreign keys by internal id, not by name —
   so renaming a table or column preserves every row, index, and FK
   relationship pointing at it. This is what actually ran:

```sql
DROP TABLE IF EXISTS programs;              -- an empty table create_all() had
                                             -- already auto-created for the new
                                             -- Program model; nothing to preserve
DROP TABLE IF EXISTS marks;                 -- empty, cheap to drop and recreate
DROP TABLE IF EXISTS subjects;              -- empty, cheap to drop and recreate
ALTER TABLE courses RENAME TO programs;     -- the 4 real rows move with it
ALTER SEQUENCE courses_id_seq RENAME TO programs_id_seq;
ALTER TABLE students RENAME COLUMN course_id TO program_id;  -- FK target follows
                                                              -- automatically
```

The empty tables (`marks`, `subjects`) were simply dropped and left for
`create_all()` to rebuild fresh from the updated models — empty tables
have nothing worth preserving, so the extra care went only where real
data actually lived.

**One real snag hit along the way:** after the rename, re-running
`create_all()` to build the new (course-unit) `courses` table failed with
`DuplicateTable: relation "ix_courses_code" already exists`. The renamed
`programs` table had kept its *old* auto-generated index and constraint
names (`ix_courses_code`, `ix_courses_id`, `courses_pkey`) — `ALTER TABLE
... RENAME TO` renames the table, not the names of things attached to
it. Since the new `courses` table's model needs those exact names for
itself, the old ones had to be freed first:

```sql
ALTER INDEX ix_courses_code RENAME TO ix_programs_code;
ALTER INDEX ix_courses_id RENAME TO ix_programs_id;
ALTER TABLE programs RENAME CONSTRAINT courses_pkey TO programs_pkey;
ALTER TABLE programs RENAME CONSTRAINT courses_faculty_id_fkey TO programs_faculty_id_fkey;
```

Worth remembering: a table rename in Postgres is cheap and safe for data,
but it's not a full identity change — everything named *by* the old table
name (indexes, constraints, sequences) keeps that old name until you
rename those explicitly too. Purely cosmetic until you collide with
something that wants the freed-up name, at which point it stops being
cosmetic.

---

## 13. Grading scale becomes admin data, plus an admin overview endpoint

Two additions on top of Phase 7, both about giving Admin more control
without touching code.

### `models/grade_band.py` — the grading scale itself, as a table

```python
class GradeBand(Base):
    __tablename__ = "grade_bands"
    id = Column(Integer, primary_key=True, index=True)
    min_score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    grade = Column(SQLEnum(Grade), unique=True, nullable=False)
```

`grade` is `unique=True` — the database itself won't allow two bands for
the same letter grade. That's a real constraint, but it can't express the
other rule that matters here: **no two bands' score ranges may overlap**
(`45-55` for one grade and `50-60` for another would make score `52`
genuinely ambiguous — which grade wins?). No single-column or even
multi-column `UniqueConstraint` can express "these two integer ranges
must not intersect," so that check lives in the router instead:

```python
overlapping = (
    db.query(GradeBand)
    .filter(GradeBand.min_score <= band_in.max_score, GradeBand.max_score >= band_in.min_score)
    .first()
)
if overlapping is not None:
    raise HTTPException(status_code=409, detail=f"Score range overlaps existing band '{overlapping.grade.value}' (...)")
```

This is the standard "do two ranges overlap" test: range A overlaps
range B exactly when `A.start <= B.end AND A.end >= B.start`. Verified
live — a band of `45-52` correctly rejected as overlapping the existing
`0-49` (`F`) band with a `409` naming which band it collided with.

`min_score <= max_score` is a different kind of rule — about one band's
own two fields agreeing with each other, not about it against every
other row — so it lives in the Pydantic schema instead, via a
`model_validator`:

```python
class GradeBandCreate(BaseModel):
    min_score: int = Field(ge=0, le=100)
    max_score: int = Field(ge=0, le=100)
    grade: Grade

    @model_validator(mode="after")
    def check_range(self):
        if self.min_score > self.max_score:
            raise ValueError("min_score must be less than or equal to max_score")
        return self
```

This runs as part of normal Pydantic validation, before the route body
even executes — same `422`-before-your-code-runs guarantee as every
other schema-level check in this project, just expressed across two
fields at once instead of one.

### `services/grading.py` — from a pure function to a database lookup

The original version (Phase 7) was a hardcoded `if score >= 80: return
Grade.A` chain — no arguments but `score`, no database access. Now that
the scale itself is admin data, the function has to ask the database:

```python
def score_to_grade(db: Session, score: int) -> Grade | None:
    band = (
        db.query(GradeBand)
        .filter(GradeBand.min_score <= score, GradeBand.max_score >= score)
        .first()
    )
    return band.grade if band else None
```

Two things worth noticing about this specific signature choice:
- It now takes `db: Session` as a parameter, breaking the "pure function,
  no side effects" property it had before — an unavoidable consequence
  of the lookup needing to hit the database. It's still not a *router* —
  it doesn't raise `HTTPException`, doesn't know about HTTP at all — it
  just returns `None` when nothing matches and lets the caller decide
  what that means.
- Returning `None` instead of raising is what makes `routers/mark.py`'s
  handling explicit and visible at the call site:
  ```python
  grade = score_to_grade(db, entry.score)
  if grade is None:
      raise HTTPException(status_code=422, detail=f"No grade band configured for score {entry.score} — ask an admin to set one up")
  ```
  A score genuinely can fail to match anything (Admin hasn't finished
  configuring the scale, or there's a gap between bands) — that's a real,
  anticipated state, not a bug, so it gets a clear `422` telling the
  caller exactly what's wrong and who can fix it, not a `500`. Verified
  live: with `grade_bands` empty, submitting a mark returned exactly this
  `422` — before any bands existed, the endpoint correctly refused to
  guess at a grade rather than silently doing something wrong.

### `routers/overview.py` — one response assembled from eight queries

```python
@router.get("/overview", response_model=OverviewOut)
def get_overview(db: Session = Depends(get_db)):
    return OverviewOut(
        staff=db.query(Staff).all(),
        faculties=db.query(Faculty).all(),
        programs=db.query(Program).all(),
        courses=db.query(Course).all(),
        semesters=db.query(Semester).all(),
        grade_bands=db.query(GradeBand).order_by(GradeBand.min_score).all(),
        students=db.query(Student).all(),
        marks=db.query(Mark).all(),
    )
```

`OverviewOut` (`schemas/overview.py`) is a composite schema — its fields
are `list[StaffOut]`, `list[FacultyOut]`, etc., reusing every entity's
existing output schema rather than defining new ones. This is the same
"build the wrapper schema explicitly" pattern already used for
`StaffPage`/`StudentPage` (§6), just aggregating across *tables* instead
of paginating one. Each nested list is validated through its own
schema's `from_attributes=True`, exactly as it would be for that
entity's own endpoint — `OverviewOut` itself doesn't need that setting,
only the leaf schemas do.

Deliberately **not paginated**, unlike `GET /staff` or `GET /students` —
this endpoint exists specifically to hand an admin dashboard "everything,
in one shot." Fine at the current scale; if any one of these lists grows
into the thousands, that tension (an admin overview wanting everything
vs. pagination existing because lists get large) is worth revisiting —
but not before it's an actual problem.

---

## 14. Phase 9 — Authentication: `User`, password hashing, JWTs

The team reordered the roadmap here — Phase 8 (images) skipped for now,
Phase 9 (this) and Phase 10 (RBAC) built next, Phase 5 (PUT/PATCH/DELETE)
pushed out even further. See [TEAM_ROADMAP.md](TEAM_ROADMAP.md) §3 for
the reasoning.

### `models/user.py` — identity, deliberately separate from profile data

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(Role), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), unique=True, nullable=True)
    student_reg_number = Column(String(30), ForeignKey("students.reg_number"), unique=True, nullable=True)
```

The original roadmap sketch had `password_hash` living directly on
`Staff` and `Student`. That got revised here: a real Admin account has
no business having a `first_name`/`gender`/`phone_number` — it isn't a
staff member — so putting login on `Staff` would force inventing a fake
profile just to hold one. `User` separates *identity* (who can log in,
with what password, at what permission level) from *profile* (`Staff`/
`Student`, which stay exactly as they were — zero changes needed to
either table or their routers).

`staff_id`/`student_reg_number` are both `nullable=True` *and*
`unique=True` — nullable because only one applies per role (or neither,
for admin), unique because a given staff member or student should only
ever have one login account. Nothing in the schema *forces* exactly one
of the two to be set for a given role, though — that's a cross-field
rule, and (same reasoning as `GradeBand`'s `min_score <= max_score` in
§13) it belongs in Pydantic, not the database:

```python
class UserCreate(BaseModel):
    username: str
    password: str
    role: Role
    staff_id: int | None = None
    student_reg_number: str | None = None

    @model_validator(mode="after")
    def check_reference(self):
        if self.role == Role.ADMIN and (self.staff_id is not None or self.student_reg_number is not None):
            raise ValueError("an admin account must not reference a staff or student record")
        if self.role == Role.STAFF and self.staff_id is None:
            raise ValueError("staff_id is required when role is 'staff'")
        # ... and so on for the remaining combinations
        return self
```

Four rules, one `model_validator` — matches the pattern from §13's
`GradeBandCreate.check_range`, just with more branches: `admin` must
reference neither, `staff` must reference `staff_id` and *not*
`student_reg_number`, `student` the mirror image. Verified live: sending
`role: "staff"` with no `staff_id` → `422`; `role: "admin"` *with* a
`staff_id` set → `422`.

### `services/security.py` — hashing and tokens, kept out of the router

```python
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), password_hash.encode())

def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

Same reasoning as `services/grading.py` (§11/§13): password hashing and
JWT creation are business/security logic that doesn't belong inline in a
router, and might be reused from more than one place later (e.g. a
future "change password" endpoint would call `hash_password` too,
without duplicating it). `bcrypt` (not `passlib`, which wraps bcrypt but
has had version-compatibility issues in recent releases) does the actual
hashing — `gensalt()` generates a fresh random salt per password, so two
users with the identical password `"Admin123"` get completely different
`password_hash` values, and the hash can't be reversed back into the
password, only *checked against* a candidate via `checkpw`.

`SECRET_KEY` comes from the `JWT_SECRET_KEY` environment variable (a
random 64-character hex string generated once and stored in `.env`,
same place `DATABASE_URL` lives) — never hardcoded, and never committed
if this project starts using git (another reason `.env` stays out of
version control, per [SETUP_GUIDE.md](SETUP_GUIDE.md)). Anyone who
obtains this key could forge valid tokens for any user, so it's exactly
as sensitive as the database password sitting right next to it.

### `routers/user.py` — creating an account, referencing an existing profile

```python
@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.staff_id is not None and db.get(Staff, user_in.staff_id) is None:
        raise HTTPException(status_code=404, detail="Staff not found")
    if user_in.student_reg_number is not None and db.get(Student, user_in.student_reg_number) is None:
        raise HTTPException(status_code=404, detail="Student not found")

    user = User(
        username=user_in.username,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        staff_id=user_in.staff_id,
        student_reg_number=user_in.student_reg_number,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already taken, or this staff/student already has an account")
    db.refresh(user)
    return user
```

The two `404` checks are the same "validate the foreign key exists
before inserting" pattern from `routers/course.py` (§9) and
`routers/student.py` (§10) — nothing new there. What *is* new: a single
`IntegrityError` here can mean **two different constraint violations**
(`username` already taken, *or* the referenced `staff_id`/
`student_reg_number` already has an account via the `unique=True` on
those columns) — and the code doesn't try to distinguish which one
happened, both get the same `409` with a message covering both
possibilities. That's a deliberate simplification: telling them apart
would mean inspecting the raw database error message (driver-specific,
brittle), and a slightly less precise error message is a reasonable
trade for not doing that.

Notice `user_in.password` (plain text, only ever exists for the instant
this function runs) never gets assigned directly to `User.password_hash`
— it always passes through `hash_password()` first. `UserOut` (the
response schema) has no `password_hash` field at all, so even a bug that
tried to leak it would have nowhere to put it — same structural
guarantee pattern as `MarkStudentOut` omitting `score` (§13).

### `routers/auth.py` — login, and why both failure modes look identical

```python
@router.post("/login", response_model=TokenOut)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role)
```

The `user is None or not verify_password(...)` check is one condition on
purpose, not two separate ones with different error messages. If a
nonexistent username got a different message than a wrong password for a
real one, that difference would let an attacker confirm which usernames
exist in the system just by trying logins — a real, well-known
information leak (username enumeration). Verified live: logging in as
`"GhostUser"` (doesn't exist) and logging in as `"Admin"` with the wrong
password both return the exact same `401` — `"Invalid username or
password"` — indistinguishable from the outside.

On success, the JWT's payload is `{"sub": "<user id>", "role":
"<admin|staff|student>", "exp": <timestamp>}` — `sub` (subject) is a JWT
standard-ish claim for "who is this token about," `role` is what Phase
10's permission checks will read, `exp` is what makes the token expire
after `ACCESS_TOKEN_EXPIRE_MINUTES` (currently 60) rather than being
valid forever.

### What Phase 9 deliberately did *not* do (at the time)

At the point Phase 9 shipped, no route anywhere — not `/staff`, not
`/students`, not `/admin/overview` — checked for a token. Everything
built in Phases 1–7 was fully open to any caller, token or not. That was
intentional sequencing: Phase 9 answers "can this request prove who it's
from," Phase 10 (next section) answers "is that identity allowed to do
this" — two different questions (authentication vs. authorization) kept
conceptually separate even though they landed in back-to-back phases.
Phase 10 is the one that actually closes every route.

---

## 15. Phase 10 — Dynamic, permission-based RBAC

The original Phase 10 plan (a static `require_role(*roles)` check) got
replaced with something bigger, per an explicit design request: **nothing
about who-can-do-what should live in Python code.** Two new tables make
that true.

### `models/permission.py` and `models/role_permission.py`

```python
class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("module", "action", name="uq_module_action"),)
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(50), nullable=False)
    action = Column(SQLEnum(Action), nullable=False)

class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role", "permission_id", name="uq_role_permission"),)
    id = Column(Integer, primary_key=True, index=True)
    role = Column(SQLEnum(Role), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
```

The split matters: `Permission` is a *catalog* of atomic capabilities
("create a student," "read a mark") — `module` is a plain `String`, not
an enum, specifically so Admin can define permissions for modules that
don't exist yet in code. `RolePermission` is the *grant* — a many-to-many
join between `Role` (still the fixed 3-value enum from Phase 9 — the
system doesn't need dynamically-creatable roles, just dynamically
assignable permissions) and `Permission`. Editing rows in `RolePermission`
*is* reconfiguring the app's access control — no route decorator, no
Python file, ever needs to change again for a permission reshuffle.

### `services/security.py` — `require_permission`, the enforcement point

```python
def require_permission(module: str, action: Action):
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        granted = (
            db.query(RolePermission)
            .join(Permission, Permission.id == RolePermission.permission_id)
            .filter(
                RolePermission.role == current_user.role,
                Permission.module == module,
                Permission.action == action,
            )
            .first()
        )
        if granted is None:
            raise HTTPException(status_code=403, detail=f"Your role does not have '{action.value}' permission on '{module}'")
        return current_user
    return dependency
```

This is a **dependency factory** — `require_permission("students",
Action.CREATE)` doesn't check anything itself, it *returns* a dependency
function (closing over `module` and `action`) that FastAPI then calls
per-request. Every protected route uses it identically:

```python
@router.post("", response_model=StudentOut, status_code=201, dependencies=[Depends(require_permission("students", Action.CREATE))])
def create_student(...): ...
```

`dependencies=[...]` (rather than a function parameter) is used
everywhere the route doesn't otherwise need the current user — it runs
the check and discards the result. Routes that *do* need to know who's
calling (for ownership checks, below) take it as a normal parameter
instead: `current_user: User = Depends(get_current_user)`, alongside a
separate `dependencies=[Depends(require_permission(...))]` for the
actual gate. Every one of the nine existing routers (`staff`, `faculty`,
`program`, `course`, `semester`, `grade_band`, `student`, `mark`, `user`,
`overview`) got exactly this treatment — same one-line addition per
route, no other code changed.

### Ownership checks — layered on top, still separate from permission

`require_permission` only answers "can this *role* do this *kind* of
thing." It has no idea which specific row is being requested. Two routes
needed a second check on top:

```python
# routers/student.py — get_student
if current_user.role == Role.STUDENT and current_user.student_reg_number != reg_number:
    raise HTTPException(status_code=403, detail="You can only view your own student record")

student = db.get(Student, reg_number)
if student is None:
    raise HTTPException(status_code=404, detail="Student not found")
```

The ownership check runs **before** the existence check, deliberately —
same reasoning as the login endpoint's unified `401` in §14: if a
mismatched `reg_number` returned `404` for a nonexistent student but
`403` for a real one that isn't theirs, an unauthorized student could use
that difference to enumerate which reg_numbers exist. Checking ownership
first means every non-owned reg_number gets the identical `403`,
regardless of whether it's real.

`routers/student.py`'s `list_students` takes a different approach for
the *same* underlying problem — there's no single "wrong" row to reject,
just a query to narrow:

```python
query = db.query(Student)
if current_user.role == Role.STUDENT:
    query = query.filter(Student.reg_number == current_user.student_reg_number)
```

A student-role caller's paginated list silently becomes "a list of just
themselves" rather than an error — still correct, just expressed as a
query filter instead of a rejection, because "give me everyone" degrades
naturally into "give me the one row you're allowed to see" without
needing special-case response handling.

### `routers/me.py` — why `/me/marks` isn't on the `mark` router

`GET /me/marks` needed to exist *outside* `routers/mark.py`'s
`/students`-prefixed router, even though it conceptually belongs with
marks. The reason is a routing collision: that router already has
`GET /students/{reg_number}/marks` — if `/me/marks` were added to the
*same* router, its full path would be `/students/me/marks`, and FastAPI
matches routes in registration order. `{reg_number}` is a wildcard
segment that would happily match the literal string `"me"`, so a request
to `/students/me/marks` could get swallowed by the *other* route instead
of reaching this one, depending on registration order — a fragile trap.
Giving it its own router with `prefix="/me"` sidesteps the ambiguity
entirely (`/me/marks`, no `/students` in the path) and doubles as the
natural home for any future "about the logged-in user" endpoint.

```python
@router.get("/marks", response_model=list[MarkStudentOut], dependencies=[Depends(require_permission("marks", Action.READ))])
def get_my_marks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != Role.STUDENT or current_user.student_reg_number is None:
        raise HTTPException(status_code=403, detail="Only a student account can view 'my marks'")
    return db.query(Mark).filter(Mark.student_reg_number == current_user.student_reg_number).all()
```

`response_model=list[MarkStudentOut]` (not `MarkOut`) is what makes this
the schema built specifically for this moment back in Phase 7 (§13) —
`score` structurally cannot appear in this response.

### `GET /auth/me` — one endpoint, the frontend's entire permission model

```python
@router.get("/me", response_model=MeOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    permissions = (
        db.query(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role == current_user.role)
        .all()
    )
    return MeOut(..., permissions=permissions)
```

This is the direct answer to "we should automatically know the
permissions a user has": one call after login returns the caller's
identity *and* their full effective permission list, computed the exact
same way `require_permission` computes it (same join, same filter) —
the frontend never needs its own copy of the access-control logic, it
just renders based on what this endpoint says is true.

### `get_last_name` — reaching across the User/Staff/Student split for a display name

Added after the fact, once the frontend needed something to greet a
user with on login. `routers/auth.py`:

```python
def get_last_name(user: User, db: Session) -> str | None:
    if user.staff_id is not None:
        staff = db.get(Staff, user.staff_id)
        return staff.last_name if staff else None
    if user.student_reg_number is not None:
        student = db.get(Student, user.student_reg_number)
        return student.last_name if student else None
    return None
```

This is the direct cost of Phase 9's design choice (§14) to keep `User`
separate from `Staff`/`Student` — a display name isn't *on* `User`, so
getting one means following whichever FK is actually set back to the
right profile table. Both `POST /auth/login` and `GET /auth/me` call
this and include `last_name` in their response, so the frontend never
has to make a second request just to greet someone by name. Returns
`None` for Admin (no linked profile at all — nothing to look up), which
`TokenOut`/`MeOut` both type as `str | None` rather than requiring a
value, so the frontend has to explicitly handle the "no display name"
case instead of it being an accident.

### The bootstrap problem

`role_permissions` starts empty. The very first request to *any*
`require_permission`-protected route — including one made by the
already-existing Admin account — would find no matching grant and get
`403`, forever, with no way to fix it through the API (since fixing it
*is itself* a `require_permission("permissions", Action.CREATE)`-gated
action). This is solved the way every real RBAC system solves it: the
initial 41 `Permission` rows and the starting grant matrix were inserted
directly into Postgres via a SQL script, bypassing the API and its
permission checks entirely — a one-time, out-of-band bootstrap, not a
code path that exists at runtime. `POST /permissions` and `POST
/role-permissions` are for Admin to extend the system *after* that
bootstrap, not for creating it from nothing.

### Verified live, end to end

Logged in as all three seeded accounts (Admin/Staff/Student) and
confirmed: `GET /auth/me` returns 41 permissions for Admin, exactly the
seeded 12 for Staff, exactly the seeded 2 for Student. Staff could read
`/faculties` but got `403` creating one; got `403` on `/admin/overview`,
`/permissions`, and `POST /users`. Student got `403` on `/faculties`
entirely (no grant at all), `403` creating a student, `200` reading their
own record, `403` reading another's, `200` on `/me/marks`. A request with
no `Authorization` header at all got `401`. Then, the actual point of the
feature: Admin granted the student role `faculties:read` **through the
running API**, and the *same* student token that had just been `403`'d
immediately got `200` on `/faculties` — no restart, no redeploy. Revoked
via `DELETE /role-permissions/{id}`, and access reverted to `403`
immediately after. That grant → access → revoke → no-access cycle,
entirely through data, is the dynamic RBAC system working as designed.

---

## 16. Self-registration — the gap Phase 9 left, closed afterward

Phase 9 gave Admin a way to create login accounts (`POST /users`) but
never gave a staff member or student a way to create their *own* —
every single account had to be hand-provisioned by Admin, which doesn't
scale past a handful of people. Two new routes in `routers/auth.py`
close that gap without touching anything else:

```python
@router.post("/register/student", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register_student(payload: RegisterStudentRequest, db: Session = Depends(get_db)):
    student = db.get(Student, payload.reg_number)
    if student is None:
        raise HTTPException(status_code=404, detail="No student record found for this registration number — ask your registrar to complete your registration first")

    if db.query(User).filter(User.student_reg_number == payload.reg_number).first() is not None:
        raise HTTPException(status_code=409, detail="An account already exists for this student — try logging in instead")

    user = User(username=payload.username, password_hash=hash_password(payload.password), role=Role.STUDENT, student_reg_number=payload.reg_number)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already taken")
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role, last_name=student.last_name)
```

`register_staff` is the structural mirror, keyed on `Staff.email`
instead of `Student.reg_number`.

### No `Depends(require_permission(...))` here — deliberately

Every other write route in this app is permission-gated. These two
aren't, and that's not an oversight: the caller has no token yet by
definition (they're creating their *first* one), so gating this behind
`require_permission` would make it uncallable — the same bootstrap
problem from §15, at individual-account scale instead of whole-system
scale. This is the second time that exact shape of problem has shown up:
Phase 10's first grants had to bypass the API entirely (a one-time SQL
seed); here, every *individual* account's first login has to bypass
permission checks the same way, every time — which is why it's a
standing, public route rather than a one-off script.

### What actually stops a random caller from creating a bogus account

Nothing checks a password or a shared secret — anyone can call this
endpoint. What limits it: the request must supply a `reg_number` or
`email` that matches a **real, already-existing** `Student`/`Staff` row
(`404` otherwise), and that row can only ever be claimed **once**
(`User.student_reg_number` and `User.staff_id` are both `unique=True` —
the second attempt gets `409`, checked explicitly here with a clear
message, on top of the same database constraint that would catch it
anyway). So the account itself can't be fabricated from nothing — the
profile has to already exist, created through the real registration
flow (Phase 6 for students, `POST /staff` for staff, both still
permission-gated as before). What this *doesn't* stop: someone else who
happens to know a real student's `reg_number` or a real staff member's
`email` claiming that account before the rightful owner does — there's
no proof-of-identity step (a confirmation email, an OTP) in between.
Worth naming plainly rather than leaving implicit: acceptable at this
project's current stage, not something to ship to real users unchanged.

### Same response shape as login, on purpose

Both routes return `TokenOut` — identical to `POST /auth/login`'s
response — and log the caller in immediately rather than requiring a
separate login call right after registering. One less round trip, and
the frontend's "store token, fetch `/auth/me`, render dashboard" code
path is reusable for both login and first-time registration without a
special case.

---

## 17. Phase 5 — PUT, PATCH, DELETE across all 8 entities

Resumed deliberately *after* Phase 10, not before — every new route here
was built permission-gated from day one instead of open-then-retrofitted.
No new `Permission`/`RolePermission` rows were needed; the Phase 10 seed
(§15) already granted `update`/`delete` correctly per module per role,
so this phase really was just "write 24 routes."

### The recurring shape, once — `faculties` as the template

```python
def _get_faculty_or_404(faculty_id: int, db: Session) -> Faculty:
    faculty = db.get(Faculty, faculty_id)
    if faculty is None:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return faculty

@router.put("/{faculty_id}", response_model=FacultyOut, dependencies=[Depends(require_permission("faculties", Action.UPDATE))])
def replace_faculty(faculty_id: int, faculty_in: FacultyCreate, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    faculty.code = faculty_in.code
    faculty.name = faculty_in.name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Faculty code already exists")
    db.refresh(faculty)
    return faculty

@router.patch("/{faculty_id}", response_model=FacultyOut, dependencies=[Depends(require_permission("faculties", Action.UPDATE))])
def update_faculty(faculty_id: int, faculty_in: FacultyUpdate, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    for field, value in faculty_in.model_dump(exclude_unset=True).items():
        setattr(faculty, field, value)
    # ...same commit/IntegrityError handling as PUT
```

Every one of the 8 entities (`Faculty`, `Program`, `Course`, `Semester`,
`GradeBand`, `Staff`, `Student`, `Mark`) follows this exact shape, with
two deliberate choices worth naming:

- **`PUT` reuses the existing `XCreate` schema** (all fields required) —
  no new schema needed, since "replace everything" and "create" demand
  the same completeness. **`PATCH` gets a new `XUpdate` schema** with
  every field `| None = None`, and the handler uses
  `model_dump(exclude_unset=True)` — this is what makes PATCH genuinely
  partial: a field the client never sent isn't in the dict at all
  (distinct from a field explicitly sent as `null`), so `setattr` only
  ever touches fields the caller actually provided.
- **`PUT` and `PATCH` share the same `404`/`409` handling**, differing
  only in which schema they accept and whether they touch every field or
  only the provided ones. This is why the template above generalizes so
  cleanly across 8 different entities — the *shape* of "replace vs.
  partially update" doesn't depend on what the entity is.

### `DELETE` — catching the FK constraint instead of pre-checking it

```python
@router.delete("/{faculty_id}", status_code=204, dependencies=[Depends(require_permission("faculties", Action.DELETE))])
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    db.delete(faculty)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete this faculty — one or more programs still belong to it")
```

Unlike the FK-exists checks on create (`db.get(Faculty, ...)` before
inserting a `Program`, §9), delete deliberately does **not** pre-check
"does anything reference this row" with a separate query — it just
attempts the delete and catches the `IntegrityError` Postgres itself
raises when a foreign key would be left dangling. Both approaches work;
this one was chosen because the database already knows the full set of
things that could reference a `Faculty` (every table with a `faculty_id`
foreign key) without the router needing to enumerate them by hand — a
pre-check would need updating every time a new entity started
referencing `Faculty`, the `IntegrityError` catch doesn't.

Same pattern deletes `Program` (blocked by `Student.program_id`),
`Course`/`Semester` (blocked by `Mark`), and `Staff` (blocked by
`User.staff_id`). `Student` deletion is blocked by *either* `Mark` or
`User` referencing it — one `try`/`except` still catches both, since
either FK violation raises the same `IntegrityError`. `GradeBand` needed
no such handling: `Mark.grade` stores the computed letter directly, not
a foreign key to the band that produced it, so deleting a band never
orphans an existing mark.

**Verified live:** deleting a `Faculty` that still had a `Program`
attached correctly returned `409` rather than a raw database error;
deleting the program first, then the faculty, both succeeded.

### Two entities needed more than the template — `Student` and `Mark`

**`Student`** reuses `_validate_faculty_program` (§10's cross-field
check — does `program_id` actually belong to `faculty_id`) on `PUT`
*and* `PATCH`, not just `POST`. The `PATCH` case is the interesting one:
since either field might be entirely absent from the request, the
handler computes the *effective* pair before validating —

```python
effective_faculty_id = updates.get("faculty_id", student.faculty_id)
effective_program_id = updates.get("program_id", student.program_id)
if "faculty_id" in updates or "program_id" in updates:
    _validate_faculty_program(db, effective_faculty_id, effective_program_id)
```

— falling back to the student's *current* value for whichever field
wasn't sent. Skipping the whole check when neither field is in the
patch avoids re-validating a combination that was already valid and
hasn't changed.

**`Mark`**'s `PATCH`/`PUT` recompute `grade` from `score_to_grade` (§13)
exactly like creation does — a client can never set `grade` directly on
update either, same structural guarantee as create. Its `GET`/`PUT`/
`PATCH`/`DELETE` all live at `/students/{reg_number}/marks/{mark_id}`,
and `_get_mark_or_404` checks *both* that the `mark_id` exists **and**
that it belongs to the `reg_number` in the URL — a mark id that's real
but belongs to a different student still returns `404`, not `403`,
since from the caller's perspective there's no mark to find at that
particular (student, mark) address.

**`GradeBand`** needed the most care of the eight, because its `POST`-time
overlap check (§13 — "does this new range collide with any existing
band") isn't quite right for updates: a band being edited always
overlaps *its own current range* trivially, so re-running that exact
query on `PATCH`/`PUT` would make every edit — even a genuine no-op —
fail against itself. The fix is one extra filter:

```python
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
        raise HTTPException(status_code=409, detail=f"Score range overlaps existing band '{overlapping.grade.value}' (...)")
```

`GradeBand.id != band_id` is the entire difference from the `POST`
version — exclude the row being edited from the collision check, since
a range can't meaningfully "overlap itself." `PATCH` also has to compute
the *effective* range before validating, same reasoning as `Student`
above — a patch that only sends `max_score` still needs to check the
combination against the *existing* `min_score`:

```python
effective_min = updates.get("min_score", band.min_score)
effective_max = updates.get("max_score", band.max_score)
if effective_min > effective_max:
    raise HTTPException(status_code=422, detail="min_score must be less than or equal to max_score")
_check_no_overlap(db, band_id, effective_min, effective_max)
```

**Verified live, both directions:** a no-op `PATCH` on the `A` band
(`{"max_score": 100}`, its existing value) succeeded — proving the
self-exclusion actually works, since without it this identical request
would `409` against itself. Then a `PATCH` attempting to move the same
band's `min_score` down to `70` — which *would* genuinely collide with
the real `B` band's `70-74` range — was correctly rejected with `409`,
and a follow-up `GET` confirmed the band's stored range was untouched by
the rejected attempt.

---

## 19. A real bug: free-choice usernames let a student log in as staff

### The bug, as actually reported

A student and a staff member ended up registering with the same
`username` **and** the same password. Logging in as the student instead
authenticated the staff account. The database itself never actually
allowed two `User` rows to share one `username` — `unique=True` (§14)
guarantees that — so what really happened is subtler and worse: the
*second* registration attempt hit the existing `409 Conflict` ("username
already taken"), the frontend didn't surface that failure clearly, and
the person walked away believing their account existed when it didn't.
The next time they "logged in" with that username/password pair, they
authenticated as whichever account had actually claimed it first — a
different person's account, with a different role. From the reporter's
seat, this looked exactly like "the backend routes me to the wrong
role," even though the real defect was one step earlier: **nothing
stopped two unrelated people from typing the same username in the first
place.**

### Why "just show the 409 better" isn't the real fix

Fixing only the frontend's error handling would still leave the
underlying hazard in place — any two people who happen to pick the same
memorable string (`"test"`, `"admin1"`, a shared nickname) are one typo
or one missed error message away from this exact confusion, forever.
The actual fix is structural: **stop letting `username` be a
freely-chosen string at all.**

### The fix — derive the identifier, don't collect it

`Staff.email` is already `unique=True` (§4). `Student.reg_number` is
already the primary key — unique by definition (§10). Both are
guaranteed unique *within their own table*, and — since an email always
contains `@` and a reg_number never does (§10's `FCI-BSE-2026-0001`
format) — a real email string and a real reg_number string can never
collide with each other either. So instead of asking the client for a
`username` and hoping it doesn't collide, the account's `username` is
now **set by the server, from data that's already guaranteed unique**:

```python
# routers/auth.py — register_student
user = User(
    username=payload.reg_number,       # was: payload.username
    password_hash=hash_password(payload.password),
    role=Role.STUDENT,
    student_reg_number=payload.reg_number,
)

# routers/auth.py — register_staff
user = User(
    username=staff.email,              # was: payload.username
    password_hash=hash_password(payload.password),
    role=Role.STAFF,
    staff_id=staff.id,
)
```

`RegisterStudentRequest`/`RegisterStaffRequest` (`schemas/auth.py`) lost
their `username` field entirely — there's nothing left to type wrong or
collide on. The only two things a caller ever provides now are the
identifier that proves which existing profile is theirs
(`reg_number`/`email`) and a `password`.

### The same hole existed in `POST /users` (Admin-provisioned accounts) — closed too

Self-registration wasn't the only path to this bug — Admin creating an
account by hand via `POST /users` (§14) could type an arbitrary,
colliding `username` for a staff or student role exactly the same way.
`UserCreate` (`schemas/user.py`) now makes `username` conditional on
role, enforced by the same `model_validator` pattern used everywhere
else in this codebase (§13's `GradeBandCreate`, §14's original
`UserCreate`):

```python
if self.role == Role.ADMIN and not self.username:
    raise ValueError("username is required when role is 'admin'")
if self.role == Role.STAFF and self.username is not None:
    raise ValueError("username must not be set for a staff account — it's derived automatically from the staff member's email")
if self.role == Role.STUDENT and self.username is not None:
    raise ValueError("username must not be set for a student account — it's derived automatically from the student's registration number")
```

Admin is the one role with no underlying profile to derive an
identifier from (§14), so it's the one case where `username` is still
freely chosen — and now *required* rather than optional, closing the
opposite gap (an admin account created with no username at all).
`routers/user.py`'s `create_user` mirrors the register routes: it looks
up the referenced `Staff`/`Student` row for its `404` check exactly as
before, then also reads `.email`/`.reg_number` off that same row to set
`username` — no separate lookup needed.

### The migration — widening a column and re-deriving already-real data

`User.username` was `String(50)` — comfortably wide for a short chosen
alias, but a real email can run longer, so it's now `String(255)` to
match `Staff.email`'s own width:

```sql
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(255);
```

The real accounts that existed *before* this fix still had their old,
freely-chosen usernames — those needed correcting too, not just new
registrations:

```sql
UPDATE users SET username = staff.email
FROM staff WHERE users.staff_id = staff.id;

UPDATE users SET username = students.reg_number
FROM students WHERE users.student_reg_number = students.reg_number;
```

This can never violate the `unique=True` constraint on `username`: each
`User` row's `staff_id`/`student_reg_number` is itself unique (§14), so
each row derives a distinct value. Verified live afterward — every real
staff account's `username` became its actual email, the real student
account's `username` became its `reg_number`, Admin's `username`
untouched.

### Verified live — the exact reported scenario, now impossible

Created a temporary staff profile and a temporary student profile, then
called `POST /auth/register/staff` and `POST /auth/register/student`
using the **identical password** for both (`"SamePass123"`) — the
precise setup that caused the original bug. Both registrations
succeeded, because there was never a `username` field to collide on in
the first place. Then logged in twice: once with the staff member's
email, once with the student's reg_number, same shared password both
times — each correctly returned its own role (`"staff"` and `"student"`
respectively), never crossing over. Also verified the new `POST /users`
guardrails directly: `role: "staff"` with a `username` set → `422`
("must not be set... derived automatically"); `role: "admin"` with no
`username` → `422` ("username is required"). All temporary test
accounts and profiles were deleted afterward.

Every entity so far lives in the one Postgres database. This phase adds
a second, different kind of database — **MongoDB**, used for exactly one
job: storing the actual bytes of an uploaded image. Postgres stores a
*link* to that image (`photo_url`), never the image itself.

### Why not just a column full of bytes in Postgres

Postgres *can* store binary data (a `BYTEA` column), but a relational
database engineered for structured rows and indexes isn't the natural
fit for "here's an arbitrary 2MB blob" — every backup, every query
touching the `users` table, every replication cycle gets heavier for
data it never actually needs to look inside. **GridFS** (MongoDB's
built-in convention for storing files, not a separate product) is built
for exactly this: it chunks a file into pieces and stores them alongside
metadata, and — relevant here since Mongo caps a single document at
16MB — auto-splits anything larger, though a profile photo capped at 5MB
(below) never comes close to needing that. Two databases, each doing the
job it's actually good at: Postgres for the relational graph of
students/staff/marks, Mongo for opaque binary blobs.

### `services/mongo.py` — the connection, mirroring `database.py`'s shape

```python
from dotenv import load_dotenv
from gridfs import GridFSBucket
from pymongo import MongoClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["university_app"]
photo_bucket = GridFSBucket(mongo_db, bucket_name="photos")
```

Deliberately the same shape as `database.py` (§3) — one shared client
object, created once at import time, reused by every request rather than
reconnecting per-request. `GridFSBucket` is the actual API surface used
elsewhere: `.upload_from_stream(...)`, `.open_download_stream(...)`,
`.delete(...)` — a small, purpose-built interface instead of hand-rolling
chunk storage.

### `User.photo_url` / `User.photo_file_id` — a link and a handle, not the image

```python
photo_url = Column(String(500), nullable=True)
photo_file_id = Column(String(24), nullable=True)
```

Two columns doing two different jobs. `photo_url` is what actually gets
sent to the frontend — a ready-to-use `<img src>` value. `photo_file_id`
is GridFS's own internal id for the stored file (a Mongo `ObjectId`,
stored here as its 24-character hex string since Postgres has no native
`ObjectId` type) — kept *only* so a later upload or delete knows exactly
which GridFS file to remove. The frontend never sees `photo_file_id` at
all (absent from every response schema); it's purely an internal
bookkeeping detail, same spirit as `password_hash` never appearing on
`UserOut` (§14).

Landed on `User`, not `Staff`/`Student` — same reasoning as
`password_hash` living on `User` back in §14: a photo belongs to
whoever's *logging in*, and Admin (who has no `Staff`/`Student` row at
all) needs one too.

### `PUT /me/photo` — validate, replace, store just the pointer

```python
@router.put("/photo", response_model=PhotoOut, dependencies=[Depends(require_permission("profile", Action.UPDATE))])
def upload_my_photo(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported image type '{file.content_type}' — use JPEG, PNG, WEBP, or GIF")

    contents = file.file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=422, detail="Image too large — max 5MB")

    if current_user.photo_file_id:
        try:
            photo_bucket.delete(ObjectId(current_user.photo_file_id))
        except NoFile:
            pass

    file_id = photo_bucket.upload_from_stream(file.filename or "photo", contents, metadata={"content_type": file.content_type})

    current_user.photo_file_id = str(file_id)
    current_user.photo_url = f"{PUBLIC_BASE_URL}/files/{file_id}"
    db.commit()
    return PhotoOut(photo_url=current_user.photo_url)
```

Worth tracing why each piece is there:
- **Content-type and size checks happen before anything touches
  GridFS** — same "reject early, cheaply" instinct as every schema-level
  `422` elsewhere in this app (e.g. `GradeBandCreate.check_range`, §13),
  just done in the router body instead of Pydantic since it depends on
  the raw uploaded bytes, not a JSON field.
- **`current_user` comes from `Depends(get_current_user)`, not a
  `{user_id}` path parameter.** There's no route like
  `PUT /users/{id}/photo` — a caller can only ever replace *their own*
  photo, by construction, not by an ownership check bolted on after the
  fact the way `GET /students/{reg_number}` needed one (§15). The
  permission model here (`profile:update`, granted identically to all
  three roles) intentionally doesn't distinguish *whose* profile,
  because the route itself only ever means "mine."
- **The old file is deleted before the new one is uploaded, using the
  *previous* `photo_file_id`.** Without this, replacing a photo would
  leak the old GridFS file forever — nothing else ever references it
  once `photo_url` is overwritten, so it would sit in Mongo unreachable
  and undeletable through the API. `except NoFile: pass` covers the
  edge case where the DB row and GridFS somehow disagree (the file was
  already gone) — not fatal, just nothing to clean up.
- **One `db.commit()` at the very end, after the GridFS upload already
  succeeded.** If the upload itself failed, this line never runs, and
  Postgres's `photo_url` stays exactly as it was — no reference to a
  file that doesn't exist.

### `DELETE /me/photo` and `GET /files/{file_id}` — remove, and serve

`DELETE /me/photo` is the mirror image: same `ObjectId`/`NoFile`
handling, then both `photo_file_id` and `photo_url` are set back to
`None`. `404` if there was nothing to delete in the first place —
distinguishing "you have no photo" from "the delete happened," same
instinct as every other `_get_or_404` helper in this codebase.

```python
@router.get("/{file_id}")
def get_file(file_id: str):
    try:
        object_id = ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        grid_out = photo_bucket.open_download_stream(object_id)
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found")
    content_type = (grid_out.metadata or {}).get("content_type", "application/octet-stream")
    return StreamingResponse(grid_out, media_type=content_type)
```

`routers/files.py` is its own tiny router (`prefix="/files"`), not
folded into `routers/me.py`, because it isn't "about the logged-in
user" at all — it's a public file server. **No
`Depends(require_permission(...))`, no `Depends(get_current_user)`, no
auth of any kind** — deliberately, and for a concrete technical reason:
an HTML `<img src="...">` tag makes a plain `GET` request with no way to
attach an `Authorization` header, so gating this route would force the
frontend to fetch the image via JS, read it into a blob, and swap it
into the `<img>` afterward, for every avatar on every screen. The
trade-off, named plainly: anyone who obtains a `file_id` — which means
anyone who obtains a `photo_url`, since it's just that id embedded in a
URL — can view that image, with no ownership check at all. Grouped with
§16's self-registration gap as the same kind of decision: a real,
deliberate limitation acceptable at this project's current stage, not
something to carry unchanged into a deployment with genuinely sensitive
images. `open_download_stream` returns a *stream*, not the full byte
array — `StreamingResponse` forwards it to the client chunk by chunk,
the same reason this pattern is used for large file downloads generally
rather than loading everything into memory first.

### `profile` — the one permission module granted equally to every role

```sql
INSERT INTO permissions (module, action) VALUES ('profile', 'READ'), ('profile', 'UPDATE'), ('profile', 'DELETE');
-- granted to ADMIN, STAFF, and STUDENT identically
```

Every other module in this system (§15) splits access by role — Staff
gets `create`/`read`/`update` on `students` but not `delete`, Student
gets almost nothing. `profile` is the one deliberate exception: managing
*your own* photo isn't a capability that should vary by role the way
managing other people's records does, so all three roles hold identical
grants here. This is the dynamic permission system (§15) demonstrating
the other direction of its flexibility — not just "who can do more,"
but "here's a module where the answer is intentionally the same for
everyone."

### Verified live, full lifecycle

Uploaded a real PNG as Admin → `PUT /me/photo` returned a `photo_url`
pointing at this backend's own `/files/{id}` route → fetched that URL
and confirmed the bytes came back byte-identical to the original file,
with `Content-Type: image/png` → `POST /auth/login` and `GET /auth/me`
both immediately included the same `photo_url`, with no separate
"fetch profile" call needed. Uploaded a second photo to replace the
first: the response's `file_id` changed, and a follow-up `GET` on the
*old* file's URL correctly returned `404` — confirming the old GridFS
file was actually deleted, not just orphaned. `DELETE /me/photo`
cleared `photo_url` back to `null` and the file's URL then also `404`'d;
a second `DELETE` attempt correctly returned `404` ("no photo to
delete"). Edge cases: a `.txt` file uploaded as a "photo" → `422`; an
oversized image → `422`; no `Authorization` header on `PUT /me/photo` →
`401`. All test uploads and downloaded verification files were deleted
afterward — the real Admin/Staff/Student accounts were left with
`photo_url`/`photo_file_id` both `null`, exactly as before testing
started.
