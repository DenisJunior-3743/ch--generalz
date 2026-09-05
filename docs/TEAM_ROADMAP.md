# University Records System — Team Roadmap

A shared, phase-by-phase plan for the whole team: **Backend** (FastAPI),
**Web** (React), and **Mobile** (Kotlin). Everyone is new to their stack —
the goal is to move fast but stay in sync, meeting up after each phase to
integrate real screens with the real API.

---

## 1. Team structure

| Team    | Stack                         | Owns                                |
| ------- | ----------------------------- | ----------------------------------- |
| Backend | FastAPI + PostgreSQL (Docker) | API, database, business rules, auth |
| Web     | React                         | Browser UI                          |
| Mobile  | Kotlin (Android)              | Android app UI, biometric auth      |

**Golden rule for staying in sync:** the backend's auto-generated docs at
`http://127.0.0.1:8000/docs` are the *contract*. Whenever backend adds or
changes an endpoint, that page updates automatically — frontend teams
should treat it as the source of truth for what fields exist, what's
required, and what a response looks like. This means frontend can start
against **dummy/mock data shaped exactly like that contract**, then swap
in the real `fetch`/Retrofit call later with minimal changes.

---

## 2. The domain: what we're building

A small university records system. Ten entities:

| Entity | Fields (starting point — refine as we go) |
|---|---|
| **Staff** | id, first_name, last_name, email, phone_number, gender (enum) — the person capturing records |
| **Student** | **reg_number (primary key)**, first_name, last_name, email, phone_number, gender (enum), faculty_id, program_id, intake_year — created **only** through the multipart wizard, never a flat form |
| **Faculty** | id, code (e.g. `SCI`), name (e.g. "Faculty of Science") — admin-managed metadata |
| **Program** | id, code (e.g. `BSCS`), name (e.g. "BSc Computer Science"), faculty_id (belongs to a Faculty) — admin-managed metadata, selected by staff during student registration |
| **Course** | id, code (e.g. `CS101`), name (e.g. "Intro to Programming") — the individual **course unit** that carries its own marks. Admin-managed metadata, selected by staff when entering a mark |
| **Semester** | id, academic_year (e.g. `"2025/2026"`), term (enum: `sem_1` \| `sem_2`), unique on (academic_year, term) — admin-managed metadata, selected by staff when entering a mark |
| **GradeBand** | id, min_score, max_score (both 0–100), grade (enum, **unique**) — admin-managed *scoring scale*, not selected by staff at all; staff never sees this table directly, the backend consults it automatically |
| **Mark** | id, student_reg_number (FK → Student.reg_number), course_id (FK → Course.id), semester_id (FK → Semester.id), score (0–100, staff-entered), **grade** (looked up server-side from `GradeBand` — see below) — entered independently, not part of registration |
| **User** *(Phase 9)* | id, username (unique), password_hash, role (enum: `admin`/`staff`/`student`), staff_id (nullable FK, unique), student_reg_number (nullable FK, unique) — login/identity, deliberately **separate** from Staff/Student profile data; see Phase 9 for why |
| **Permission** *(Phase 10)* | id, module (free text, e.g. `"students"`), action (enum: `create`/`read`/`update`/`delete`), unique on (module, action) — an atomic "can do X to Y" unit. `module` is deliberately **not** an enum — Admin can define permissions for modules that don't exist yet in code |
| **RolePermission** *(Phase 10)* | id, role (enum), permission_id (FK → Permission.id), unique on (role, permission_id) — the actual grant: "this role may do this." Admin adds/removes rows here to reshape access **without any code change** — this table *is* the dynamic permission system |

> **Why Semester is its own entity, not just a `sem_1`/`sem_2` field on
> Mark (the earlier design):** an academic year has exactly two terms,
> but *which* academic year matters too — a bare `"sem_1"` on a mark
> doesn't say whether it's this year's first semester or next year's.
> `Semester` pairs a `term` (the fixed, ever-two-valued part — kept as
> its own small `Term` enum, `models/enums.py`) with an `academic_year`
> (the part that grows every year), and Admin creates one `Semester` row
> per actual term as it starts. Staff then *select* the current semester
> from `GET /semesters` when entering marks — same admin-managed,
> selector-feeding shape as Faculty/Program/Course, just with two fields
> per row instead of code+name.

> **Naming note (corrected after the first pass got this backwards):**
> "Program" means the *degree programme* (BSc Computer Science) — what a
> student is enrolled in. "Course" means an individual **course unit**
> that carries its own marks (e.g. a BSc Computer Science student takes
> many courses, one of which might be CS101) — matching "marks are
> entered per course unit," the standard phrase for this. An earlier
> version of this doc called the degree "Course" and the unit "Subject" —
> if you see either of those terms anywhere (old commit, old note), they
> mean Program and Course respectively now.

> **Grading — score entered by staff, grade looked up from admin-defined
> bands, and who sees what:** staff enter a raw numeric `score` (0–100)
> per mark. The backend looks up which `GradeBand` row the score falls
> into (`min_score <= score <= max_score`) and stores the matching
> `grade` alongside it — via `services/grading.py`'s `score_to_grade(db,
> score)` (see [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) §13).
> **This used to be a hardcoded table in Python**; it's now Admin-entered
> data, so the scale can be changed (a new academic policy, a different
> program's grading scheme) without a code deploy. The values currently
> seeded match the original design:
> | Score | Grade |
> |---|---|
> | 0–49 | F |
> | 50–55 | D |
> | 56–59 | D+ |
> | 60–64 | C |
> | 65–69 | C+ |
> | 70–74 | B |
> | 75–79 | B+ |
> | 80–100 | A |
>
> If a score doesn't fall into any configured band (e.g. Admin hasn't
> finished setting up the scale yet), marks entry fails with a `422` and
> a clear message — never silently guesses or defaults to a grade.
>
> Staff can see both `score` and `grade`; a student can only ever see
> `grade`, never the numeric `score`. Two separate output schemas exist
> for this reason — `MarkOut` (score + grade, used by staff-facing
> routes) and `MarkStudentOut` (grade only, no score) — but which one a
> given request gets back is a **permission decision**, so it can't be
> fully wired up until Phase 9/10 (auth + RBAC) exists to know who's
> asking. `MarkStudentOut` is built and ready; Phase 10's `GET /me/marks`
> is what will actually return it.

> **The Admin/Staff pattern:** Faculty, Program, Course, Semester, and
> `GradeBand` are all **admin-owned metadata**, but they split into two
> shapes. Faculty/Program/Course/Semester are *reference/metadata
> tables* — a small catalog everything else *reads from* via plain `GET`
> list endpoints, which is what powers every dropdown/selector in this
> system; staff never create these directly, they select from what
> Admin already set up (Faculty → Program at registration, Course +
> Semester at marks entry). `GradeBand` is admin-owned too, but staff
> never see it or select from it at all — it's consulted *automatically*
> by the backend every time a mark is created. `Admin` turned out **not**
> to be a permission level on `Staff` after all (the original plan here)
> — Phase 9 built it as its own `role` value on the separate `User`
> entity instead, precisely because a real Admin account shouldn't have
> to carry a fake staff profile. Either way, the write endpoints for all
> five of these entities still aren't permission-gated yet — that's
> exactly what Phase 10 adds.

> **reg_number as primary key — a design trade-off worth understanding:**
> most systems use an auto-increment `id` as the primary key and keep
> "natural" identifiers like a registration number as a separate unique
> field, because natural keys occasionally need to change (typos, policy
> changes) and changing a primary key that other tables reference (like
> `Mark.student_reg_number`) is awkward. We're deliberately using
> `reg_number` as the real primary key anyway here, because (a) it's
> genuinely immutable once assigned in a real university, and (b) it
> doubles as the student's login identifier in Phase 9 — a nice
> real-world payoff for the simpler design. Captured as a required field
> on the Bio Data form (Phase 1) and enforced unique by the database
> itself (duplicate → `409 Conflict`).
>
> **Format constraint learned the hard way:** the reg_number's *value*
> must never contain a literal `/` — it ends up inside a URL path
> (`GET /students/{reg_number}`), and a `/` there gets read as an extra
> path segment, not part of the identifier, breaking that route
> (confirmed live: `FCI/BSE/2026/0001` 404'd on lookup despite existing).
> Use a URL-safe separator instead — e.g. `FCI-BSE-2026-0001` — so the
> Bio Data form should validate/reject `/` in this field client-side too.

A student's *full* record is captured across **two screens**, but as a
**single `POST /students`** request — not the POST-then-PATCH wizard
originally sketched here. Both screens' fields are held in the frontend's
own state and only submitted together at the end, so building this stays
entirely within POST/GET (PUT/PATCH/DELETE are deliberately being held
off until their own dedicated phase, later):
- **Screen 1 — Bio data**: reg_number, first_name, last_name, email,
  phone_number, gender
- **Screen 2 — Uni info**: faculty (selector) → program (selector, filtered
  by chosen faculty), intake year

The backend validates the combination on submit: `faculty_id` must exist
(`404` if not), `program_id` must exist (`404` if not), and the selected
program must actually belong to the selected faculty (`422` if not — a
defensive check in case the frontend's cascading selector is ever
bypassed, e.g. a stale cached program list after switching faculty).

Marks are **not** part of registration — they're entered later, on their
own independent screen (Phase 7 below), because in a real university
marks get entered repeatedly (every semester) long after a student is
registered once.

> **Note:** the Staff quick-registration form (Phase 2) and the Student's
> Phase 1 (Bio data) use the exact same shape of fields (name/email/phone/
> gender) — but they're two different entities. You'll literally build
> this shape of form twice: once flat for Staff, once as step 1 of the
> Student wizard. That repetition is what makes the wizard's extra
> plumbing (state across steps, "Next" navigation) obvious by contrast.

---

## 3. Phase-by-phase plan

Each phase lists Backend / Web tasks side by side, plus the **meeting
point** — the moment both sides plug into each other for real.

### Phase 0 — Environment setup (all teams, in parallel)

| Backend                                                                           | Web                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Already done — see [SETUP_GUIDE.md](SETUP_GUIDE.md) (FastAPI + Docker + Postgres) | Install Node.js LTS, scaffold a React app (see §6 below) |

**Meeting point:** none yet — pure setup.

---

### Phase 1 — Modular project structure

| Backend                                                                                                                                                                                                    | Web                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Split `main.py` into modules: `routers/`, `schemas/` (Pydantic), `models/` (SQLAlchemy), `services/` (business logic), `database.py`. One router per entity (`students.py`, `faculty.py`, `course.py`) | Set up folder structure: `components/`, `pages/` (or `routes/`), `api/` (a thin client wrapper), `types/` |

**Meeting point:** none — internal scaffolding on both sides.

---

### Phase 2 — Simple POST: Staff registration

| Backend                                                                                                                                                                                         | Web                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /staff` — Pydantic schema validates first_name, last_name, email, phone_number, gender (a `Gender` enum — see §4). Returns `201 Created` with the new staff record, or `422` on bad input | **First, build it dummy:** a single form screen with client-side validation (required fields, email format, phone format, gender as a dropdown) that just logs the payload to console |
| Add `GET /staff/{id}` to fetch one back                                                                                                                                                         | Once backend's `/staff` is live, swap the dummy submit for a real `fetch`/axios POST call. Show success/error based on the real response                                              |

**Meeting point:** ✅ **Web's staff registration form POSTs to the real
backend and shows the created staff record back on screen.**

*(Mobile does the same thing in Kotlin — see §5.)*

> Staff are the ones who log in and capture student data — this entity is
> what Phase 9 (auth) builds directly on top of.

---

### Phase 3 — Faculty & Program (introduces the selector pattern)

| Backend | Web |
|---|---|
| `POST /faculties`, `GET /faculties` (returns a list — this is what feeds selectors). `POST /programs` (body includes `faculty_id`, `404` if that faculty doesn't exist), `GET /programs?faculty_id=` (filtered list) | Dummy Faculty form (code, name) → wire to `POST /faculties`. Dummy Program form with a `<select>` populated by `GET /faculties`, then submits to `POST /programs` |

**Meeting point:** ✅ **Web's Program form loads real faculties into a
dropdown, and creates a program tied to the selected faculty.**

Both of these are logically **admin-only** operations — see the Admin/
Staff note in §2. No enforcement yet (Phase 9/10 adds it), but keep the
frontend's admin screens visually/structurally separate from staff
screens now, so wiring in real permission checks later doesn't mean
rebuilding the UI.

---

### Phase 4 — GET with pagination & query parameters

| Backend                                                                                                                                    | Web                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /students?page=1&page_size=20` — return `{items, total, page, page_size}`. Also support filtering, e.g. `GET /students?gender=female` | Build a paged list/table screen: shows current page of students, Next/Previous buttons, a filter input tied to a query param |

**Meeting point:** ✅ **Web's list screen renders real, paged data and
filters update the query correctly.**

This is also where you deliberately test **query parameter validation** —
try `page=-1`, `page_size=0`, `page_size=9999` and see what your backend
should do about it (reject with `422`, or clamp?).

---

### Phase 5 — PUT, PATCH, DELETE ✅ done

**Resumed after Phase 10**, once RBAC existed to actually gate who's
allowed to edit/delete what — this phase was originally deferred, then
deliberately picked back up *after* permissions rather than before, so
every new route could be permission-gated from the moment it was built
instead of retrofitted later.

Covers all 8 entities that previously only had POST + GET: **Staff,
Faculty, Program, Course, Semester, GradeBand, Student, Mark** —
24 new routes (`PUT`/`PATCH`/`DELETE` × 8), each wired to
`require_permission(module, Action.UPDATE)` or `Action.DELETE` exactly
like every other route since Phase 10. No new permission data was
needed — the Phase 10 seed already granted `update`/`delete` correctly
per module per role, so this phase was purely "build the routes."

| Backend | Web |
|---|---|
| `PUT /{resource}/{id}` (full replace — all fields required), `PATCH /{resource}/{id}` (partial — only sent fields change), `DELETE /{resource}/{id}` (`204 No Content`, `404` if missing) for all 8 entities. Deleting something still referenced elsewhere (a Faculty with Programs, a Program with Students, a Course/Semester with Marks, a Staff member with a login account) returns `409`, not a raw DB error | Edit screen (pre-filled form → `PUT` or `PATCH`, discuss which one and why), Delete button with a confirmation dialog — and now, a real reason to handle `403` distinctly from other errors, since staff will hit it on some of these and admin won't |

**Meeting point:** ✅ **The permission boundary from Phase 10 is now
load-bearing, not theoretical** — verified live: staff (which has
`update` but not `delete` on `students`/`marks`) successfully `PATCH`ed
a student and a mark, then correctly got `403` trying to `DELETE`
either. Staff also got `403` on `PATCH`/`DELETE` for every
admin-only-write module (`faculties`, `courses`, `staff`, etc.), since
staff only ever had `read` there. Admin could do all of it. Same two
questions as always, now with real routes behind them: *is this role
allowed to do this kind of thing* (permission), and *on this specific
row* (ownership, where it applies — students/marks still self-scope for
a student token, though students have no update/delete grant at all
right now so this mostly matters for future roles).

**Two implementation details worth knowing:**
- **Editing a `Mark`'s `score` recomputes `grade`** the same way creating
  one does (via `score_to_grade`) — verified live: patching a mark's
  score from 60 to 75 changed its stored grade from `C` to `B+`
  automatically. You can't patch `grade` directly; it isn't accepted as
  input on update either, same as create.
- **`GradeBand` updates re-run the overlap check, excluding itself** —
  a band's own range trivially "overlaps" its own unchanged values, so
  the check explicitly excludes the record being edited (`GradeBand.id
  != band_id`) or every no-op edit would falsely conflict with itself.
  Verified live: a same-value patch succeeded (proving self-exclusion
  works), and a patch that would've genuinely overlapped a *different*
  band was still correctly rejected with `409`.

This phase is also where deliberately studying status codes pays off:
what happens (and what *should* happen) when you `DELETE` something
twice, or `PATCH` an id that doesn't exist, or try to delete something
still in use elsewhere?

---

### Phase 6 — Multipart wizard: student registration (2 screens, 1 request)

| Backend | Web |
|---|---|
| `POST /students` — all fields at once: bio data + `faculty_id` + `program_id` + `intake_year`. Validates faculty exists (`404`), program exists (`404`), program belongs to that faculty (`422`), reg_number/email uniqueness (`409`) | Two-step form component: step state held client-side across both screens, step 2 uses the faculty→program selector from Phase 3, **one submit at the very end** fires the single `POST` |

**Meeting point:** ✅ **A staff user fully registers a student across both
screens, ending up as one complete record in the database from a single
request.**

`GET /students` (paginated, same shape as Phase 4's `GET /staff`) and
`GET /students/{reg_number}` also built here — both entities' full
POST+GET set is done before moving to PUT/PATCH/DELETE as its own later
phase.

---

### Phase 7 — Course + Semester catalogs, then marks entry (independent, selector-driven)

Three small sub-phases: the Course (course-unit) metadata and the
Semester metadata (both the same admin-managed, selector-feeding pattern
as Faculty/Program in Phase 3), then the actual marks entry screen built
on top of both.

| Backend | Web |
|---|---|
| `POST /courses`, `GET /courses`, `POST /semesters`, `GET /semesters` (both admin-managed catalogs, same pattern as Faculty). Reuse the paged/search list from Phase 4 (`GET /students?search=`) to power a student picker. `POST /students/{reg_number}/marks` — accepts a **list** of mark rows (`course_id` and `semester_id`, both selected from their catalogs, plus score 0–100), looks up each row's letter `grade` server-side from admin-defined `GradeBand`s (see §2 and the addendum below), and wraps the whole batch in **one database transaction**: all rows save, or none do | Dummy Course form and dummy Semester form (both admin screens, same shape as Faculty). A dedicated "Enter Marks" screen (staff): search/select an already-registered student, pick the current semester from a `<select>` populated by `GET /semesters`, then a small repeatable row form where each row's course is a `<select>` populated by `GET /courses` — not free text — plus a score field (0–100), before one final submit |

**Meeting point:** ✅ **A staff user can pick any already-registered
student and submit a batch of marks for them, independent of when that
student was registered.**

This is where **transactions** become concrete — and it's been verified
live, not just theoretically: a `Mark` has a database-level uniqueness
constraint on `(student_reg_number, course_id, semester_id)`, so a batch
containing one brand-new valid mark plus one duplicate of an existing
mark gets rejected as a whole (`409`) — the new, individually-valid entry
does **not** get saved either, because both marks are staged with
`db.add_all()` and only committed together with one `db.commit()`. Ask
"what should the user see if this happens?" — the frontend needs to
re-show the whole batch as failed, not assume some rows succeeded.

**Grade computation, verified live across every boundary:** submitted
scores `0, 49, 50, 55, 56, 59, 60, 64, 65, 69, 70, 74, 75, 79, 80, 100` in
one batch and confirmed every single one translated to the exact grade
the table in §2 says it should — including both sides of every boundary
(49→F / 50→D, 59→D+ / 60→C, etc.), which is exactly where an off-by-one
bug would show up if there was one.

Both `POST`/`GET /courses` and `POST`/`GET /semesters` also built here,
same admin-metadata pattern as Faculty (§2) — including the same "not
enforced yet, but designed for Phase 9/10" caveat, and verified live: two
real semesters created for `"2025/2026"` (`sem_1` and `sem_2`), and a
duplicate of the same academic_year+term pair correctly rejected with
`409`. `GET /students/{reg_number}/marks` was added too, ahead of the
original plan,
since it's needed for a staff user to verify what they just entered —
it currently returns `MarkOut` (score + grade, the staff view). This is
also the endpoint Phase 10's student-facing "My Marks" screen will
reuse conceptually, but that one returns `MarkStudentOut` (grade only)
instead, scoped to the logged-in student's own reg_number.

**Addendum — grading scale moved from hardcoded to admin metadata:**
the original `score_to_grade` was a fixed Python if/elif chain (the
table shown in §2). It's now `GradeBand` — an admin-managed table of
`(min_score, max_score, grade)` rows, following the exact same
admin-owned-metadata philosophy as everything else in this phase, just
without a frontend selector (staff never touch this table; the backend
consults it automatically). Two new checks that didn't exist for any
prior entity: **range overlap** (`POST /grade-bands` rejects a new band
whose score range overlaps an existing one, `409`, since an ambiguous
score-to-two-grades mapping would be a real bug) and **no matching band**
(a score outside every configured range fails marks entry with a clear
`422`, rather than silently defaulting to some grade). Verified live: an
overlapping band rejected, `min_score > max_score` rejected (`422`), and
— seeded with the original 8-band scale — the exact same boundary scores
as before (`49→F`, `50→D`, ... `80→A`) still resolve correctly, now via
database lookup instead of hardcoded comparisons.

**Addendum — `GET /admin/overview`:** a single endpoint that returns
every record across all seven entities in one response — built for an
admin dashboard screen that needs to show "everything" at a glance
without seven separate requests. Deliberately unpaginated for now (fine
at current scale; would need rethinking — see Phase 4's pagination note
— if any of these lists grows large). Logically admin-only, same
not-yet-enforced caveat as every other admin route in this doc.

---

### Phase 8 — Profile photos ✅ done (final phase — the roadmap is complete)

**Design ended up different from the original sketch above**, in two
ways, once this phase actually got built (last, after everything else):

1. **MongoDB GridFS instead of local disk.** The original plan said
   "start with local disk under a `static/` folder." By the time this
   phase was reached, a MongoDB Atlas cluster already existed
   specifically for this — GridFS stores the actual image bytes there
   (MongoDB documents cap out at 16MB; GridFS chunks anything larger,
   though profile photos here are capped well below that anyway). This
   is a second database alongside Postgres, used for exactly one thing:
   binary file storage that doesn't belong in a relational table.
2. **Tied to `User` (one photo per account), not `Student` specifically.**
   The original sketch was student-photo-only
   (`POST /students/{reg_number}/photo`). The actual need was broader —
   "so people can add their pics" applies equally to Admin, Staff, and
   Student — so `photo_url` lives on `User`, and the endpoints are
   `/me/photo` (upload/delete your own), not tied to any one role.

**Backend:** `PUT /me/photo` (multipart upload, replaces any existing
photo and deletes the old GridFS file), `DELETE /me/photo`, and a public
`GET /files/{file_id}` that streams the image bytes back with the
correct content-type — this is literally what the stored `photo_url`
points at. New `profile` permission module (`read`/`update`/`delete`),
granted identically to all three roles, since managing your own photo
isn't something that should differ by role the way the other modules do.

**Web:** an image upload input with a live preview before submit
(`PUT /me/photo`), and — this is the "on login, fetch profile and
display" requirement — render `photo_url` from `POST /auth/login`'s
response immediately (no extra request needed), and again from
`GET /auth/me` afterward for consistency (e.g. after a page refresh).

**Meeting point:** ✅ **A photo uploaded from the browser is stored via
GridFS and displayed back correctly** — verified live end-to-end: upload
→ byte-identical download through the public URL → correct
`Content-Type: image/png` → `photo_url` appears in both the login
response and `GET /auth/me` → replacing the photo deletes the old GridFS
file (confirmed via a `404` on the old file's URL afterward) → deleting
the photo clears both `photo_url` and the underlying file, `404` on a
second delete attempt.

**Why the "URL" is a URL to *our own* API, not a MongoDB link:** GridFS
isn't a public file server — there's no way to hand a browser a direct
link into MongoDB. The stored `photo_url` is always
`{PUBLIC_BASE_URL}/files/{file_id}` — a link to this backend's own
public `GET /files/{file_id}` route, which is what actually streams the
bytes out of GridFS on request. `PUBLIC_BASE_URL` is a `.env` value
(currently the reserved static ngrok domain — see
[NETWORKING.md](NETWORKING.md) §4c) — worth knowing this means a stored
`photo_url` would go stale if that domain ever changed, which is exactly
why a *static* domain mattered for this, not just for the frontend's
convenience.

**`GET /files/{file_id}` is deliberately public — no token required.**
A plain `<img src="...">` tag can't attach an `Authorization` header, so
gating this endpoint would mean the frontend has to fetch-and-blob every
avatar in JS instead of just using an `<img>` tag directly. The
trade-off: anyone who obtains a `file_id` can view that image, no
ownership check. Treated the same way as the self-registration
verification gap (§9) — a real, deliberate, named limitation, acceptable
for a learning project's current stage, not something to ship unchanged
to a system with genuinely sensitive images.

---

### Phase 9 — Authentication (a separate `users` table, three roles)

**Reordered:** the team chose to do Phase 9 (auth) and Phase 10 (RBAC)
next, skipping Phase 8 (images/logos) for now — it'll resume after
Phase 10, before circling back to the still-deferred Phase 5
(PUT/PATCH/DELETE).

**Design revised from the original sketch above:** rather than adding a
`password_hash` directly to `Staff` and `Student`, login/identity lives
in its own **`User`** entity — `id`, `username`, `password_hash`, `role`
(`admin`/`staff`/`student`), plus two *nullable* foreign keys
(`staff_id`, `student_reg_number`), exactly one of which is set
depending on `role` (neither, for `admin`). This is what makes a real,
standalone **Admin** account possible — an admin isn't a real staff
member with a name/phone/gender, so forcing one onto the `Staff` table
would mean inventing a fake profile just to hold a login. A separate
table cleanly separates *auth* (this table) from *profile* (`Staff`/
`Student`), and needed zero changes to those already-built entities.

| Backend | Web |
|---|---|
| `POST /users` — creates a login account: `username`, `password` (hashed with `bcrypt`, never stored plain), `role`, and the matching reference (`staff_id` for staff, `student_reg_number` for student, neither for admin — cross-checked by a schema validator). `POST /auth/login` — `username` + `password`, returns a JWT (`sub` = user id, `role` claim) on success, generic `401` on any failure (wrong password *and* unknown username get the identical message — never reveal which one was wrong) | Login screen, store the token (discuss: localStorage vs. httpOnly cookie, and why), attach it to every API call, redirect on `401` |

**Meeting point:** ✅ **Any of the three roles can log in through the
same screen and get back a token carrying their role.**

**Added afterward — a display name on login:** `POST /auth/login` and
`GET /auth/me` both also return `last_name`, looked up from the linked
`Staff`/`Student` profile via `staff_id`/`student_reg_number` — enough
for a "Welcome back, {last_name}" greeting with no extra request. It's
`null` for Admin, since that account deliberately has no linked profile
(the whole reason `User` is separate from `Staff`/`Student` — see
above); frontend should fall back to showing `username` when `null`.

**Added afterward — self-registration (the real gap this plan missed
initially):** the original design only gave Admin a way to create login
accounts (`POST /users`, gated by `users:create` since Phase 10). That
left no way for an actual staff member or student to set up their *own*
credentials without Admin doing it by hand for every single person —
not workable past a handful of accounts. Two new **public, unauthenticated**
endpoints fix this: `POST /auth/register/student` (proves ownership via
the student's own `reg_number`) and `POST /auth/register/staff` (via
the staff member's registered `email`). Both require the underlying
`Staff`/`Student` profile to already exist (created through the normal
registration flow — self-registration only ever creates the *login*,
never the profile), reject a second account for an already-claimed
profile, and log the caller in immediately on success — same response
shape as `POST /auth/login`, `last_name` included.

**The trade-off, stated plainly:** anyone who knows a real reg_number or
staff email can currently claim that account — there's no email
verification or OTP step confirming the caller actually is that person.
Acceptable for where this project is now; a real deployment would add a
verification step before treating an account as claimed.

**Verified live:** created a real `Admin` account (`username: "Admin"`,
password hashed, not the literal `"Admin123"` sitting in the database),
a staff-linked account, and a student-linked account. All three logged
in successfully; wrong password and a nonexistent username both
correctly returned the same `401`. Every validation path checked too:
`422` for a `staff` role missing `staff_id` (or an `admin` role
*with* one set), `409` for a duplicate `username` or a `staff_id`/
`student_reg_number` that already has an account, `404` for a
`staff_id`/`student_reg_number` that doesn't exist at all.

**Deliberately not done in this phase:** no route anywhere checks the
JWT yet — every endpoint built so far is still fully open. Phase 9 is
only "can you prove who you are"; Phase 10 is "what does that let you
do."

**Corrected after a real bug report, once real people were using it:**
`username` started out as a field the caller typed freely at
registration — "pick any username you like." That turned out to be a
genuine design flaw, not just a theoretical one: a student and a staff
member picked the same username *and* the same password during testing,
and logging in as the student authenticated the pre-existing staff
account instead (whichever account actually held that username string
first — the second registration attempt should have been rejected with
`409`, but the person hit that failure and didn't realize their account
was never actually created, then unknowingly logged into someone else's
session). The fix removes the free-choice field entirely:
`POST /auth/register/student` now takes only `reg_number` + `password`,
`POST /auth/register/staff` only `email` + `password` — the account's
`username` is *derived* automatically (the student's own `reg_number`,
the staff member's own `email`), never typed. Same rule now applies to
Admin-provisioned accounts (`POST /users`): `username` is only accepted
(and required) for `role: "admin"`; supplying one for a `staff`/
`student` role is rejected with `422`. See
[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) §19 for the full
reasoning and the live collision test that proves the fix.

*(Mobile adds biometric login on top of this same JWT flow — see §5.)*

---

### Phase 10 — Dynamic, permission-based RBAC (revised, bigger than the original sketch)

**Design upgraded from a static `require_role()` check** (the original
plan above) **to a fully data-driven permission system**: nothing about
"who can do what" is hardcoded in Python anymore. Two new tables —
`Permission` (an atomic `module` + `action` unit) and `RolePermission`
(which `Role` has which `Permission`) — mean Admin can reshape access
for the whole app by editing rows through the API, no deploy required.

| Backend | Web |
|---|---|
| `require_permission(module, action)` — a FastAPI dependency factory used as `Depends(require_permission("students", Action.CREATE))` on every route. Looks up whether the caller's role has a matching `RolePermission` row; `403` if not. `POST`/`GET /permissions` and `POST`/`GET`/`DELETE /role-permissions` let Admin manage the grant matrix live. `GET /auth/me` returns the caller's role **and** effective permission list in one call | On login, call `GET /auth/me` once and cache the `permissions` array. Gate every page/button/action by checking membership in that list (`{module: "students", action: "create"}`) — this is what "automatically know the permissions a user has" means in practice: one fetch, then pure client-side lookups, no per-feature hardcoding |

**Meeting point:** ✅ **The exact same dashboard renders differently per
role purely from data** — an admin sees every module and every action; a
staff member sees registration and marks entry (create/read/update, no
delete) plus read-only metadata catalogs; a student sees only their own
record and their own grades. Proven live, not just in principle: Admin
granted the student role read-access to `faculties` **through the
running API**, watched a previously-`403` student request immediately
return `200` with no code change or restart, then revoked it and watched
it go back to `403` — that round trip *is* the feature.

**Your "registration" example, exactly as specified — verified live:**
for the `students` module, staff has `create`/`read`/`update` (no
`delete`), student has `read` only, admin has all four. Same shape
applied to `marks`. Your "opens for staff only" example needed no new
mechanism at all: a module (e.g. `staff`) simply has **zero** grants for
the student role, which is already "closed to that role" — absence of a
`RolePermission` row *is* the lockout, nothing else required.

**Ownership — still a separate check, layered on top of permission:**
*hiding a button on the frontend is a UX nicety, not security* — the
backend independently enforces everything, assuming any request could
bypass the UI entirely. `require_permission` only answers "can this
role do this *kind* of thing at all." A second, route-specific check
answers "on *which* row" — e.g. `GET /students/{reg_number}`: a student
whose token doesn't match the requested `reg_number` gets `403` even
though their role *does* have `students:read`. This check runs **before**
the "does this record even exist" check, deliberately — so an
unauthorized student can't use the response (403 vs. 404) to probe which
reg_numbers are real. The paginated `GET /students` list applies the same
principle differently: a student-role caller's query is silently
filtered to just their own record rather than rejected outright.

**`GET /me/marks`** — the dedicated student "My Marks" endpoint from the
original plan, now live at the top level (not nested under `/students`,
to avoid colliding with `/students/{reg_number}/marks`'s route pattern).
Returns `MarkStudentOut` (grade only, no `score`) — the schema built
back in Phase 7 specifically for this moment.

**The bootstrap problem, and how it was solved:** `RolePermission` starts
empty, so *nothing* — not even the seeded Admin account — could pass a
single permission check until grants exist. The 41 `Permission` rows and
the initial grant matrix (Admin: everything; Staff: create/read/update
on students and marks, read on the metadata catalogs and staff
directory; Student: read on students and marks) were seeded **directly
into the database**, bypassing the API entirely — the same pattern any
real RBAC system uses for its first-run setup (a migration/fixture, not
an authenticated request). `POST /permissions` and `POST
/role-permissions` exist for Admin to extend this going forward, but
they couldn't have created the *first* grants themselves.

---

## 4. Backend good practices (apply from Phase 1 onward)

- **Separate layers**: `router` (HTTP concerns only) → `service`
  (business logic) → `model` (DB shape). Don't put SQL queries directly in
  route functions once the app grows past a couple of endpoints.
- **Pydantic schemas ≠ SQLAlchemy models.** Have an input schema
  (`StudentCreate`), an output schema (`StudentOut`), and the DB model —
  keeps what clients can send separate from what's stored.
- **One router per entity**, mounted with a prefix:
  `app.include_router(students.router, prefix="/students")`. This is
  literally what "splitting into modules so one failing part doesn't
  break another" means in FastAPI — a bug in the marks module shouldn't
  be able to crash the faculties module, because they're separate files
  with separate routers.
- **Use response_model** on every route (`@app.get("/students",
  response_model=list[StudentOut])`) — FastAPI will strip out any field
  you didn't mean to expose (e.g. a password hash).
- **Transactions**: SQLAlchemy sessions default to "commit only when you
  say so." For multi-step writes (Phase 6), do all the inserts, then one
  `db.commit()` at the end; if anything raises, the session should
  `db.rollback()` (a `try/except` around the whole operation, or FastAPI
  dependency-level session handling that rolls back on exception).
- **Validate at the boundary.** Pydantic already rejects malformed input
  before your function body even runs — don't re-validate the same thing
  deeper in the service layer.
- **Status codes are part of your API design, not an afterthought.**
  Decide up front: `201` for creation, `200` for reads/updates, `204` for
  delete, `404` for missing resources, `422` for validation errors, `409`
  for conflicts (e.g. duplicate email).
- **Use enums for every fixed-choice field**, not free-text strings —
  `gender`, `term` (the sem_1/sem_2 half of `Semester`), `grade`, `role`
  (on `User` — `admin`/`staff`/`student`, Phase 9), and `action` (on
  `Permission` — `create`/`read`/`update`/`delete`, Phase 10) are the
  current five. Define them once in Python:
  ```python
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
  ```
  Use the type directly in your Pydantic schema (`gender: Gender`) —
  FastAPI then rejects any other value with a `422` automatically, *and*
  renders the valid options as a dropdown in `/docs`. Use the same enum as
  the SQLAlchemy column type (`Column(SQLEnum(Gender))`) so Postgres
  enforces it too, not just the API layer. This is also exactly what makes
  frontend selectors trivial: expose the enum's values (e.g. via a small
  `GET /enums/gender` helper endpoint, or just hardcode the known set on
  the frontend since it rarely changes) and a `<select>`/dropdown falls
  right out of it — the same pattern as the faculty/program selector, just
  with a fixed list instead of one fetched from the database. `Grade` is
  a slightly different case worth noticing: nothing ever accepts it as
  *input* — it's a computed, read-only value the backend derives from
  `score` (§2) and only ever appears in responses. `Role` (added Phase 9,
  `models/enums.py`) is what a JWT's `role` claim carries, and what
  `RolePermission` rows key off of — Phase 10's `require_permission()`
  joins through that table rather than checking `Role` directly, which
  is what makes the whole thing data-driven instead of a hardcoded
  per-role check.

---

## 5. Frontend good practices

### Web (React)
- **A thin API layer.** One `api/students.js` (or `.ts`) module wrapping
  `fetch`/axios calls — components never call `fetch` directly. Makes it
  trivial to swap dummy data for real calls later.
- **Form validation library** — `react-hook-form` + `zod` (or `yup`) is
  the standard combo. Define the validation schema once, reuse it for
  both the simple form and each step of the wizard.
- **Environment variables** for the API base URL (`VITE_API_URL` if using
  Vite), never hardcode `http://127.0.0.1:8000` in components.
- **Loading / error / empty states** for every screen that fetches data —
  a paged list screen has at minimum 4 states: loading, error, empty,
  populated. Design for all of them from day one.
- **RBAC on the frontend (Phase 10):** call `GET /auth/me` once at login
  and cache its `permissions` array (`{module, action}` pairs) in your
  auth context/state — don't try to decode permission logic out of the
  JWT itself, the token only carries `role`, not the effective grant
  list. Use the cached permissions for two things only — (1) **route
  guards**: redirect away from a page if the user lacks `read` on its
  module, and (2) **hiding UI**: don't render a "Create" button if the
  user lacks `create` on that module. Treat this as UX polish only — the
  backend's `require_permission` and ownership checks are what actually
  keep data safe, not this. Since permissions are now data (Admin can
  change them anytime), don't hardcode "students can do X" anywhere in
  frontend logic either — always check the fetched list.

### Mobile (Kotlin) — brief pointers, since it mirrors web conceptually
- **Retrofit** for the API client, **Jetpack Compose** for screens (modern
  standard, easier to learn than the older XML/View system).
- **ViewModel + StateFlow** to hold screen state (loading/error/data) —
  the Compose equivalent of React's state + API layer pattern.
- **Biometric login**: use Android's `BiometricPrompt` API *after* a
  normal JWT login has happened once — biometrics typically unlock a
  securely-stored token (via `EncryptedSharedPreferences` or the Android
  Keystore), it doesn't replace the backend auth flow.
- **RBAC**: same principle as web — fetch `GET /auth/me`'s permissions
  once, cache them, use them to decide which screens/nav destinations are
  reachable, but never treat that as the actual security boundary.

---

## 6. Environment setup guides

### Web team (React)

1. Install [Node.js LTS](https://nodejs.org) (includes `npm`).
2. Scaffold with Vite (faster and simpler than Create React App):
   ```
   npm create vite@latest university-web -- --template react
   cd university-web
   npm install
   npm run dev
   ```
3. Install form + HTTP helpers:
   ```
   npm install react-hook-form zod @hookform/resolvers axios
   ```
4. Confirm it's running at `http://localhost:5173`, then try calling the
   backend's `/health` endpoint from a component to prove cross-origin
   requests work (you'll need to add CORS middleware on the FastAPI side
   — ask backend to add `fastapi.middleware.cors.CORSMiddleware` allowing
   `http://localhost:5173`).

### Mobile team (Kotlin)

1. Install **Android Studio** (includes the Kotlin toolchain and an
   emulator manager).
2. New Project → "Empty Activity" template with **Jetpack Compose**
   checked.
3. Add dependencies (in `build.gradle.kts`, app module): Retrofit,
   OkHttp logging interceptor, and (later) `androidx.biometric`.
4. Run the emulator, confirm you can hit
   `http://10.0.2.2:8000/health` (the emulator's special alias for your
   host machine's `localhost`) and see a response.

### Backend team

Already fully set up — see [SETUP_GUIDE.md](SETUP_GUIDE.md).
One addition needed for this phase: enable CORS so React (and later the
emulator) can call the API from a different origin:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://10.0.2.2:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 7. HTTP status code cheat sheet (build this up as you hit real cases)

| Code | Meaning               | When you'll see it here                                                    |
| ---- | --------------------- | -------------------------------------------------------------------------- |
| 200  | OK                    | Successful GET, PUT, PATCH                                                 |
| 201  | Created               | Successful POST that creates a resource                                    |
| 204  | No Content            | Successful DELETE                                                          |
| 400  | Bad Request           | Malformed request the server can't parse at all                            |
| 401  | Unauthorized          | Missing/invalid auth token (Phase 9)                                       |
| 403  | Forbidden             | Valid token, but wrong role or not the record's owner (Phase 10 RBAC)      |
| 404  | Not Found             | GET/PATCH/DELETE on an id/reg_number that doesn't exist                    |
| 409  | Conflict              | e.g. duplicate reg_number or email on registration                         |
| 422  | Unprocessable Entity  | Pydantic validation failed (FastAPI's default for bad input shape)         |
| 500  | Internal Server Error | An unhandled bug — treat every one you see as something to fix, not ignore |

---

## 8. Suggested order to actually start

1. Backend: Phase 1 (modular restructure) — small, low-risk, sets up
   everything after it.
2. Backend + Web in parallel: Phase 2 (simple POST) — first real meeting
   point, builds confidence fast.
3. From there, follow the phases in numeric order... with one deliberate
   exception, decided partway through: **Phase 8 (images/logos) is
   skipped for now, resumed after Phase 10**, and **Phase 5
   (PUT/PATCH/DELETE) is deferred all the way until after Phase 10 too**
   — the actual order that ended up happening is Phases 1→4, 6, 7, 9, 10,
   *then* back to 5, *then* 8. Both of these were conscious reorderings
   made mid-project (see the notes on Phase 5 and Phase 8 themselves),
   not the original plan — worth remembering if you're wondering why the
   phase numbers stopped matching the build order.

Current status: Phases 1–7 and 9–10 are all built and verified. Phase 8
(images/logos) is the only one left, per the reordering above.
