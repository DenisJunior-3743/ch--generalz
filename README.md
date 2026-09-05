# University Records System

A university records system built as a real team project — students,
staff, faculties, programs, courses, semesters, marks, dynamic
role-based permissions, and profile photos — across three separately
owned, separately deployed pieces that live together in one repo.

## The team

| Folder | Stack | Owns |
|---|---|---|
| [`backend/`](backend/) | FastAPI + PostgreSQL + MongoDB (GridFS) | API, database, business rules, auth |
| `web/` | React | Browser UI |
| `mobile/` | Kotlin (Android) | Android app UI |

Each folder is a self-contained project with its own dependencies, its
own way of running locally, and its own deploy target — living in one
repo doesn't mean deploying together, it means one shared history and
one place for docs that all three teams rely on. See
[`docs/NETWORKING.md`](docs/NETWORKING.md) for exactly how web/mobile
reach the backend across local dev, same-WiFi, and fully-public (ngrok)
setups.

## What's built

The backend is feature-complete end to end:

- **Core records** — Staff, Student (multipart registration wizard),
  Faculty, Program, Course, Semester, Mark — full `POST`/`GET`/`PUT`/
  `PATCH`/`DELETE` on every entity.
- **Admin-configurable grading** — `GradeBand` maps score ranges to
  letter grades; staff enter numeric scores, the backend derives the
  grade, students only ever see the letter.
- **Auth** — a separate `users` table (Admin/Staff/Student), JWTs,
  self-registration for staff (via their email) and students (via their
  reg_number) so accounts don't all have to be hand-provisioned by
  Admin. Login identifiers are always derived from data that's already
  guaranteed unique (email/reg_number), never freely chosen — see
  [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) §19 for
  why that matters.
- **Dynamic, permission-based RBAC** — every route is gated by a
  `module:action` permission looked up at request time from an
  admin-editable grant table, not hardcoded roles. Admin can create new
  permissions and reshape who-can-do-what live, with zero redeploys.
- **Profile photos** — MongoDB GridFS stores the image, Postgres stores
  just the URL; upload/replace/delete your own via `/me/photo`, fetched
  automatically on login.

Full phase-by-phase history (including the bugs hit and fixed along the
way) is in [`docs/TEAM_ROADMAP.md`](docs/TEAM_ROADMAP.md).

## Repo layout

```
ch--generalz/
├── backend/            FastAPI app
│   ├── main.py
│   ├── database.py
│   ├── models/          SQLAlchemy tables
│   ├── schemas/          Pydantic request/response shapes
│   ├── routers/          endpoints
│   ├── services/         business logic (grading, security, mongo)
│   ├── PostgreSQL/        docker-compose.yml + DB init script
│   └── requirements.txt
├── web/                 React app (added by the web team)
├── mobile/              Android app (added by the mobile team)
└── docs/                shared by all three teams
    ├── TEAM_ROADMAP.md          full phase-by-phase plan and history
    ├── API_REFERENCE.md         every endpoint + frontend integration guide
    ├── BACKEND_ARCHITECTURE.md  how the backend code is structured
    ├── NETWORKING.md            CORS + how frontend reaches backend
    └── SETUP_GUIDE.md           local dev environment setup
```

## Getting started

**If you're building web or mobile screens, start with
[`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)'s "🚦 Getting started
from an empty system" section before writing a single login screen** —
it's the exact bootstrap order (Admin → metadata → staff profile → staff
claims login → student profile → student claims login) that prevents
building against an endpoint that `404`s because an earlier step hasn't
happened yet.

**Running the backend locally:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
docker compose -f PostgreSQL/docker-compose.yml up -d
```
Create `backend/.env` with:
```
DATABASE_URL=postgresql://myuser:<password>@localhost:5432/mydatabase
JWT_SECRET_KEY=<a random 64-char hex string>
MONGO_URI=<your MongoDB Atlas connection string>
PUBLIC_BASE_URL=http://127.0.0.1:8000
```
then:
```bash
uvicorn main:app --reload
```
Full walkthrough (Docker, Postgres, MongoDB, what each `.env` value
means) is in [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md).

**Web/mobile:** clone this repo, add your project's files into `web/`
or `mobile/` respectively, and point your API base URL at the backend
per [`docs/NETWORKING.md`](docs/NETWORKING.md).

## Contributing (small-team workflow, nothing heavier than needed)

- Work on a branch (`git checkout -b web/login-screen`), open a PR into
  `main` rather than pushing straight to it — cheap insurance, even for
  a 3-person team.
- Stay inside your own top-level folder (`backend/`, `web/`, `mobile/`)
  — folder boundaries keep merge conflicts between teams rare by
  construction.
- `docs/` is the one shared folder everyone touches — if you're editing
  it at the same time as someone else, just say so.
- Backend changes that affect the API contract (new endpoint, changed
  field, new permission) should update
  [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) in the same PR — it's
  the thing web/mobile actually build against.
