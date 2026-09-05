# University Records System

A university records system built as a team project across three stacks:

| Folder | Stack | Owns |
|---|---|---|
| [`backend/`](backend/) | FastAPI + PostgreSQL + MongoDB (GridFS) | API, database, business rules, auth |
| `web/` | React | Browser UI |
| `mobile/` | Kotlin (Android) | Android app UI |

Each folder is a self-contained project with its own dependencies and its
own deploy story — living in one repo doesn't mean deploying together,
it just means one shared history and one place for docs that all three
teams rely on.

## Start here

- [`docs/TEAM_ROADMAP.md`](docs/TEAM_ROADMAP.md) — the full phase-by-phase
  plan and what's actually been built so far.
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — every backend
  endpoint, written for whoever's building web or mobile against it.
  Read the "Getting started from an empty system" section first if
  you're building login/registration screens.
- [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) — how
  the backend code is structured, for anyone working inside `backend/`.
- [`docs/NETWORKING.md`](docs/NETWORKING.md) — CORS, and how the
  frontend actually reaches the backend in each connectivity scenario
  (local dev, same-WiFi, fully public via ngrok).
- [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) — backend-specific setup
  (Docker, Postgres, MongoDB, environment variables).
