# API Reference — Frontend Integration Guide

Everything the backend currently exposes, for the web (React) and mobile
(Kotlin) teams to build against. New entities get a new section here as
soon as their endpoints go live — check back after each backend phase
lands. (Previously this file was Staff-only and named
`API_REFERENCE_STAFF.md` — renamed since it now covers more than one
entity.)

The live, always-accurate version of this is `http://127.0.0.1:8000/docs`
— if anything here ever looks out of date, that page is the source of
truth, not this file.

**Building login/signup screens? Read "Getting started from an empty
system" below first** — it's the difference between everything working
and every self-registration call mysteriously `404`ing.

> **Naming correction:** an earlier version of this file called the
> degree entity "Course" (`/courses`) and the course-unit entity
> "Subject" (`/subjects`). Those got swapped to match how the terms are
> actually used: **Program** is now the degree (BSc Computer Science),
> **Course** is the individual course unit that carries marks (CS101).
> If you built anything against the old names, it needs updating — see
> the Program and Course sections below for the current shapes.

---

## Base URL

```
http://127.0.0.1:8000
```

**Web (React) note:** CORS is enabled for `http://localhost:5173`
(Vite's default dev port), plus ngrok tunnel origins and LAN IPs on that
same port (for testing from a phone). If your dev server runs on a
different port or you hit a CORS error for any other reason, **see
[NETWORKING.md](NETWORKING.md)** — it covers what CORS actually is, how
this project configures it, and exactly where to touch for every
connectivity scenario (local, same-WiFi, ngrok).

**Mobile (Kotlin emulator) note:** use `http://10.0.2.2:8000` instead of
`127.0.0.1` — that's the Android emulator's special alias for your host
machine. CORS doesn't apply to native app requests, only browsers.

---

## 🚦 Getting started from an empty system — read this before building any auth screens

**If you're building login/signup screens against this API, start here.**
Building them in isolation — without knowing the order below — is exactly
how a frontend ends up stuck: every self-registration attempt fails with
a confusing `404`, and it looks like a bug even though it isn't.

**The core thing to understand: `POST /auth/register/*` is not a normal
"Sign Up" flow.** It doesn't create a person out of nothing — it *claims
a login* for a profile (`Staff` or `Student`) that must already exist.
Someone with the right permission always creates that profile first.
There is no path that skips this — not even for Admin (there's no
`POST /auth/register/admin` at all; see below).

**The full order, from a completely empty system:**

1. **Admin already exists.** One `Admin` account is seeded directly into
   the database before the API is ever used for the first time — Admin
   isn't tied to a `Staff`/`Student` profile at all, so there's nothing
   for it to self-register *against*. Just log in: `POST /auth/login`
   with `{"username": "Admin", "password": "Admin123"}` (or whatever
   Admin's real credentials are in your environment).
2. **Admin sets up the metadata catalog** — `POST /faculties`, `POST
   /programs`, `POST /courses`, `POST /semesters`, `POST /grade-bands`.
   Do this before touching student registration or marks entry; both
   depend on this data already existing.
3. **Admin creates a Staff profile:** `POST /staff`. This is a personnel
   record (name, email, phone) — **not** a login. At this point that
   staff member still cannot log in.
4. **That staff member claims their own login:** `POST
   /auth/register/staff`, using the exact email Admin just entered. This
   is the step that turns "a person Admin typed into the system" into
   "a person who can actually authenticate." From here on, they log in
   normally via `POST /auth/login` — the register endpoint is only ever
   needed once, per person.
5. **Now logged in as staff, register a Student:** `POST /students` —
   again, a profile, not a login.
6. **That student claims their own login:** `POST
   /auth/register/student`, using the `reg_number` staff just assigned.
7. **Staff enters marks** for that student: `POST
   /students/{reg_number}/marks`.
8. **The student logs in** (`POST /auth/login`) and sees their own
   grades via `GET /me/marks` — never their numeric score, only `grade`
   (see the Marks entry section below for why).

**If your build order doesn't match this, you'll hit exactly the
deadlock this section exists to prevent.** A public "Sign Up" screen
wired to `POST /auth/register/staff` before any `Staff` profile exists
will `404` on every single attempt (`"No staff record found for this
email"`) — that's step 4 being reached before step 3 ever happened, not
a bug in the endpoint. Build (or at least test against) an Admin-side
"Add Staff" / "Add Student" screen *before* the public registration
screen, or seed the profiles directly through `/docs` while the
registration UI is being built in parallel.

---

## ⚠️ Every endpoint below requires auth now (Phase 10 landed)

**This changes how you call almost everything documented in this file.**
Only `GET /health`, `POST /auth/login`, and the two self-registration
endpoints (`POST /auth/register/student`, `POST /auth/register/staff` —
see below) are truly open — **every other route, including `POST
/users`, now requires a valid token**:

```
Authorization: Bearer <access_token>
```

(the `access_token` from `POST /auth/login`'s response — or from either
`/auth/register/*` endpoint, which log the caller in immediately).
`POST /users` is not an exception in normal use — it requires
`users:create` like any other permission-gated route, and exists for
Admin to provision accounts directly. The *only* bootstrap exception was
the very first Admin account ever created in this system, made once,
out-of-band, before any token existed to authorize it (see the Users &
Authentication section below) — don't design a signup flow assuming this
endpoint is ever open again.

Two failure modes you'll now see everywhere, on top of each endpoint's
own documented errors:
- **`401 Unauthorized`** — two different message shapes depending on
  *why*: `{"detail": "Not authenticated"}` if the `Authorization` header
  is missing entirely, `{"detail": "Invalid or expired token"}` if one
  was sent but doesn't check out. Treat both the same in the UI (redirect
  to login) — the distinction only matters if you're debugging.
- **`403 Forbidden`** — valid token, but this role isn't allowed to do
  this. Message looks like `"Your role does not have 'create' permission
  on 'students'"`. Don't treat this as a bug to retry — show it (or
  hide the button that led here in the first place, per the RBAC
  section below).

### How to know what a logged-in user can do

Call **`GET /auth/me`** once, right after login:
```json
{
  "id": 2, "username": "jane@example.com", "role": "staff",
  "staff_id": 1, "student_reg_number": null, "last_name": "Doe",
  "photo_url": "https://sharita-beerier-reputably.ngrok-free.dev/files/66f1a2b3c4d5e6f7a8b9c0d1",
  "permissions": [
    { "id": 5, "module": "students", "action": "create" },
    { "id": 6, "module": "students", "action": "read" },
    { "id": 7, "module": "students", "action": "update" },
    { "id": 30, "module": "marks", "action": "read" }
  ]
}
```
`photo_url` is `null` until the account has uploaded one via
`PUT /me/photo` (see the "Profile Photo" section below) — treat `null`
as "show a default avatar," not an error.
Cache the `permissions` array. Every module/action pair in this file's
sections below maps to one entry here — before rendering a "Create
Student" button, check whether `{module: "students", action: "create"}`
is in the list; before showing an admin-only page, check for **any**
permission on that page's module. **This is UX only** — the backend
enforces the real boundary independently (via `require_permission` on
every route), so a bug in your permission-check logic can make your UI
wrong but can never expose data the backend wouldn't already refuse to
serve.

**Don't decode the JWT client-side to figure out permissions** — it only
carries `role`, not the effective grant list (that's computed
server-side from the `RolePermission` table, which can change anytime).
`GET /auth/me` is the one source of truth.

### The seeded default grants (current state — Admin can change these anytime)

| Module | Admin | Staff | Student |
|---|---|---|---|
| `staff` | CRUD | read | — |
| `students` | CRUD | create, read, update | read (own record only — see below) |
| `faculties` | CRUD | read | — |
| `programs` | CRUD | read | — |
| `courses` | CRUD | read | — |
| `semesters` | CRUD | read | — |
| `grade_bands` | CRUD | read | — |
| `marks` | CRUD | create, read, update | read (own marks only) |
| `users` | CRUD | — | — |
| `permissions` | CRUD | — | — |
| `overview` | read | — | — |
| `profile` | read, update, delete | read, update, delete | read, update, delete |

`—` means no grant at all — the module is completely invisible to that
role, not just read-only. **This table can go stale** — Admin manages it
live through `GET /permissions` and `GET /role-permissions`, so treat it
as "what's true today," not a hardcoded contract. When in doubt, trust
`GET /auth/me`'s response over this table.

### Ownership — narrower than the permission table shows

A `student`-role account having `students:read` doesn't mean it can read
*any* student — `GET /students/{reg_number}` returns `403` if the
`reg_number` isn't the logged-in student's own, and `GET /students`
(the paginated list) silently returns just their own single record
instead of the full roster. Same story for marks: `GET
/students/{reg_number}/marks` is `403` for anyone else's, and the
dedicated `GET /me/marks` (see below) only ever returns the caller's own.

---

## Staff

### `POST /staff` — create a staff member

**Requires `staff:create`.**

**Request body (JSON):**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone_number": "0712345678",
  "gender": "female"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| first_name | string | yes | |
| last_name | string | yes | |
| email | string | yes | must be a valid email format |
| phone_number | string | yes | |
| gender | string | yes | must be exactly `"male"`, `"female"`, or `"other"` (lowercase) |

**Success — `201 Created`:**
```json
{
  "id": 1,
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone_number": "0712345678",
  "gender": "female"
}
```

**Errors:**
- `422` — validation failed (bad email format, missing field, or `gender` not one of the three allowed values). See the error shape below.
- `409` — a staff member with that `email` already exists.

---

### `GET /staff` — list staff (paginated)

**Requires `staff:read`.**

**Query params:**

| Param | Default | Constraints |
|---|---|---|
| `page` | `1` | must be ≥ 1 |
| `page_size` | `10` | must be between 1 and 100 |

Example: `GET /staff?page=2&page_size=10`

**Success — `200 OK`:**
```json
{
  "items": [
    { "id": 1, "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com", "phone_number": "0712345678", "gender": "female" }
  ],
  "total": 11,
  "page": 1,
  "page_size": 10
}
```
`total` is the count across *all* pages, not just this response — use it
to compute total pages (`Math.ceil(total / page_size)`) and to know when
to disable a "Next" button (`page * page_size >= total`).

**Errors:**
- `422` — `page` or `page_size` outside their allowed range.

---

### `GET /staff/{id}` — get one staff member

**Requires `staff:read`.**

Example: `GET /staff/1`

**Success — `200 OK`:** a single staff object, same shape as one item in
the list endpoint above (no `items`/`total` wrapper).

**Errors:**
- `404` — no staff member with that id.

---

### `PUT /staff/{id}` / `PATCH /staff/{id}` — update a staff member

**Requires `staff:update` — Admin only by default.** Notice this is
different from `students`/`marks`: staff has `read`-only on the `staff`
module itself (see the grant table at the top of this file), so a staff
member cannot edit even their *own* profile through this endpoint —
verified live: a staff token gets `403` here. `PUT` needs every field;
`PATCH` accepts any subset.

**Errors:** `422` invalid field. `404` no staff member with that id.
`409` duplicate `email`.

### `DELETE /staff/{id}` — remove a staff member

**Requires `staff:delete` — Admin only.** **Errors:** `404` no staff
member with that id. `409` — this staff member still has a login
account (`User.staff_id` references them); delete that account first.

---

## Faculty (admin-managed metadata)

### `POST /faculties` — create a faculty

**Requires `faculties:create`.**

**Request body (JSON):**
```json
{ "code": "SCI", "name": "Faculty of Science" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| code | string | yes | must be unique |
| name | string | yes | |

**Success — `201 Created`:**
```json
{ "id": 1, "code": "SCI", "name": "Faculty of Science" }
```

**Errors:**
- `422` — missing/invalid field.
- `409` — a faculty with that `code` already exists.

---

### `GET /faculties` — list all faculties

**Requires `faculties:read`.**

No pagination, no query params — this is a small reference list meant to
feed a dropdown directly, so it always returns everything, sorted by
name.

**Success — `200 OK`:**
```json
[
  { "id": 1, "code": "SCI", "name": "Faculty of Science" }
]
```

This is the exact endpoint that powers the faculty `<select>` in both the
Program-creation form (below) and step 2 of the student registration
wizard.

### `PUT /faculties/{id}` / `PATCH /faculties/{id}` — update a faculty

**Requires `faculties:update`.** `PUT` needs both `code` and `name`;
`PATCH` accepts either alone.

**Errors:** `422` invalid field. `404` no faculty with that id. `409`
duplicate `code`.

### `DELETE /faculties/{id}` — remove a faculty

**Requires `faculties:delete`.** **Errors:** `404` no faculty with that
id. `409` — one or more programs still belong to this faculty; delete
those first (verified live: attempting this against a faculty with an
active program returns exactly this `409`).

---

## Program (admin-managed metadata — the degree, e.g. BSc Computer Science)

### `POST /programs` — create a program

**Requires `programs:create`.**

**Request body (JSON):**
```json
{ "code": "BSCS", "name": "BSc Computer Science", "faculty_id": 1 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| code | string | yes | must be unique |
| name | string | yes | |
| faculty_id | number | yes | must be an existing faculty's `id` |

**Success — `201 Created`:**
```json
{ "id": 1, "code": "BSCS", "name": "BSc Computer Science", "faculty_id": 1 }
```

**Errors:**
- `422` — missing/invalid field.
- `404` — `faculty_id` doesn't match any existing faculty. **This is a different failure mode than the 422s above** — the shape is correct, but it points at something that doesn't exist. Show a clear "faculty not found" message, not a generic form-validation error.
- `409` — a program with that `code` already exists.

---

### `GET /programs` — list programs, optionally filtered by faculty

**Requires `programs:read`.**

**Query params:**

| Param | Required | Notes |
|---|---|---|
| `faculty_id` | no | if provided, only returns programs under that faculty |

Examples:
- `GET /programs` — every program, across all faculties
- `GET /programs?faculty_id=1` — only programs under faculty `1`

**Success — `200 OK`:**
```json
[
  { "id": 1, "code": "BSCS", "name": "BSc Computer Science", "faculty_id": 1 }
]
```

**This is the selector pattern in action:** the Program dropdown in step
2 of student registration should call `GET /programs?faculty_id={selected}`
*after* the user picks a faculty — populate it fresh each time the
faculty selection changes, don't pre-load every program up front.

### `PUT /programs/{id}` / `PATCH /programs/{id}` — update a program

**Requires `programs:update`.** `PUT` needs `code`, `name`, and
`faculty_id` together; `PATCH` accepts any subset. If `faculty_id` is
included (either way), it's re-validated to exist — same `404` as
create.

**Errors:** `422` invalid field. `404` — the given `faculty_id` doesn't
exist, or (for `PUT`/`PATCH` themselves) no program has this `id`. `409`
— duplicate `code`.

### `DELETE /programs/{id}` — remove a program

**Requires `programs:delete`.** **Errors:** `404` no program with that
id. `409` — one or more students are enrolled in this program.

---

## Student (registration — one request, two-screen wizard)

### `POST /students` — register a student

**Requires `students:create`** (staff or admin — not student).

**Important:** this is a **single request** carrying both wizard screens'
data together — there is no separate "step 2" call. Hold both screens'
form state on the frontend and only call this once, after the final
"Submit" on screen 2.

**Request body (JSON):**
```json
{
  "reg_number": "FCI-BSE-2026-0001",
  "first_name": "Alice",
  "last_name": "Wanjiru",
  "email": "alice.wanjiru@example.com",
  "phone_number": "0722334455",
  "gender": "female",
  "faculty_id": 3,
  "program_id": 3,
  "intake_year": 2026
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| reg_number | string | yes | **must not contain `/`** — it's used in URLs (`GET /students/{reg_number}`); a `/` breaks routing. Use dashes: `FCI-BSE-2026-0001`. Validate this client-side before submit. |
| first_name | string | yes | |
| last_name | string | yes | |
| email | string | yes | must be a valid email format |
| phone_number | string | yes | |
| gender | string | yes | `"male"` \| `"female"` \| `"other"` |
| faculty_id | number | yes | from `GET /faculties` |
| program_id | number | yes | from `GET /programs?faculty_id=...`, filtered by the chosen faculty |
| intake_year | number | yes | |

**Success — `201 Created`:** the full student object (same shape as the
request body).

**Errors:**
- `422` — a field failed validation (bad email, bad gender, etc.), **or** `program_id` doesn't belong to `faculty_id` (message: `"Selected program does not belong to the selected faculty"`) — this second case means the request was well-formed but the faculty/program combination doesn't make sense. If your cascading selector is implemented correctly (reload programs whenever faculty changes) this should never actually happen from the UI, but handle it anyway.
- `404` — `faculty_id` or `program_id` doesn't exist (message says which).
- `409` — `reg_number` or `email` already registered.

---

### `GET /students` — list students (paginated)

**Requires `students:read`.** For a `student`-role caller, this silently
returns only their own record (`total: 1`), not the full roster — see
the Ownership note at the top of this file.

Identical shape to `GET /staff` above — same `page`/`page_size` params,
same defaults, same `{items, total, page, page_size}` response.

---

### `GET /students/{reg_number}` — get one student

**Requires `students:read`.**

Example: `GET /students/FCI-BSE-2026-0001`

**Success — `200 OK`:** the student object. **Errors:** `403` if you're
logged in as a student and `reg_number` isn't your own (checked
**before** the `404` below, so any reg_number that isn't yours returns
`403` whether or not it's real — this is deliberate, see the Ownership
note at the top of this file). `404` if no student has that reg_number
(and it isn't blocked by the check above).

---

### `PUT /students/{reg_number}` — replace a student's editable fields

**Requires `students:update`** (staff or admin — student has no update
grant at all, regardless of ownership). `reg_number` itself is never
editable this way — it's fixed once set, since it's the primary key and
appears in every other URL that references this student. Every other
field is required, same validation as create (`faculty_id`/`program_id`
must exist and agree with each other).

**Request body:** same shape as `POST /students` but **without**
`reg_number`:
```json
{ "first_name": "Alice", "last_name": "Wanjiru", "email": "alice.w@example.com", "phone_number": "0722334455", "gender": "female", "faculty_id": 3, "program_id": 3, "intake_year": 2026 }
```

**Errors:** same shapes as create — `422` (validation or faculty/program
mismatch), `404` (faculty/program not found), `409` (email taken by a
*different* student). Plus `404` if the `reg_number` in the URL doesn't
exist.

### `PATCH /students/{reg_number}` — partially update a student

**Requires `students:update`.** Send only the field(s) changing. If you
send `faculty_id` and/or `program_id`, the faculty/program agreement
check still runs — against whichever of the two you *didn't* send, taken
from the student's current value.

**Request body:** `{ "phone_number": "0711000111" }`

**Errors:** same shapes as `PUT`.

### `DELETE /students/{reg_number}` — remove a student

**Requires `students:delete`** (admin only, by default — staff has
`create`/`read`/`update` on `students` but not `delete`, matching the
original "staff can do everything except delete" registration rule).

**Errors:** `401`/`403` as above. `404` no student with that reg_number.
`409` — this student still has marks and/or a login account referencing
them; those need removing first (or the mark's `DELETE` endpoint, below,
for marks specifically).

---

## Course (admin-managed metadata — an individual course unit that carries marks, e.g. "CS101")

Same shape as Faculty. See the naming note at the top of this file —
"Course" here is deliberately not the degree (that's Program, above).

### `POST /courses` — create a course

**Requires `courses:create`.**

**Request body:** `{ "code": "CS101", "name": "Intro to Programming" }`

**Success — `201 Created`:** `{ "id": 1, "code": "CS101", "name": "Intro to Programming" }`

**Errors:** `422` invalid field. `409` duplicate `code`.

### `GET /courses` — list all courses

**Requires `courses:read`.**

No pagination, no filters — same reasoning as `GET /faculties`: this is
a small reference list meant to populate a dropdown in one shot.

**Success — `200 OK`:** `[{ "id": 1, "code": "CS101", "name": "Intro to Programming" }, ...]`

This is what powers the course `<select>` on each row of the marks entry
screen below.

### `PUT /courses/{id}` / `PATCH /courses/{id}` — update a course

**Requires `courses:update`.** `PUT` needs both `code` and `name`;
`PATCH` accepts either alone. Same `409` as create on a duplicate `code`.

### `DELETE /courses/{id}` — remove a course

**Requires `courses:delete`.** **Errors:** `404` no course with that id.
`409` — one or more marks still reference this course.

---

## Semester (admin-managed metadata — a specific academic year + term, e.g. "2025/2026 Semester 1")

An academic year always has exactly two terms, but *which* year matters
for record-keeping — that's why this isn't just a fixed `sem_1`/`sem_2`
dropdown with nothing else. Admin creates one `Semester` row per actual
term as it starts; staff select the current one from this list when
entering marks.

### `POST /semesters` — create a semester

**Requires `semesters:create`.**

**Request body:** `{ "academic_year": "2025/2026", "term": "sem_1" }`

| Field | Type | Required | Notes |
|---|---|---|---|
| academic_year | string | yes | free text, e.g. `"2025/2026"` |
| term | string | yes | `"sem_1"` \| `"sem_2"` |

**Success — `201 Created`:** `{ "id": 1, "academic_year": "2025/2026", "term": "sem_1" }`

**Errors:** `422` invalid field. `409` — this exact academic_year + term
combination already exists (verified live: creating `"2025/2026"` /
`"sem_1"` twice correctly returns `409` the second time).

### `GET /semesters` — list all semesters

**Requires `semesters:read`.**

No pagination — small reference list, same reasoning as `GET /faculties`.

**Success — `200 OK`:** `[{ "id": 1, "academic_year": "2025/2026", "term": "sem_1" }, { "id": 2, "academic_year": "2025/2026", "term": "sem_2" }, ...]`

This powers the semester `<select>` on the marks entry screen below —
typically you'd default it to whichever semester is "current," however
your admin screen chooses to indicate that (e.g. sort by id descending
and default to the newest).

### `PUT /semesters/{id}` / `PATCH /semesters/{id}` — update a semester

**Requires `semesters:update`.** `PUT` needs both `academic_year` and
`term`; `PATCH` accepts either alone. Same `409` as create if the
resulting combination already belongs to a different semester.

### `DELETE /semesters/{id}` — remove a semester

**Requires `semesters:delete`.** **Errors:** `404` no semester with that
id. `409` — one or more marks still reference this semester; delete
(or reassign) those first.

---

## Grade Bands (admin-managed metadata — the scoring scale itself)

**Not a selector shown to staff at all** — unlike every other admin
entity in this file, there's no `<select>` anywhere that uses this. It's
an admin config screen only: Admin defines which score ranges map to
which letter grades, and the backend consults this table automatically
every time a mark is created. Staff never see or choose a `grade_band`.

### `POST /grade-bands` — create a grade band

**Requires `grade_bands:create`.**

**Request body:** `{ "min_score": 80, "max_score": 100, "grade": "A" }`

| Field | Type | Required | Notes |
|---|---|---|---|
| min_score | number | yes | 0–100, must be ≤ `max_score` |
| max_score | number | yes | 0–100 |
| grade | string | yes | one of `"A"`, `"B+"`, `"B"`, `"C+"`, `"C"`, `"D+"`, `"D"`, `"F"` — must be unique, one band per grade |

**Success — `201 Created`:** `{ "id": 1, "min_score": 80, "max_score": 100, "grade": "A" }`

**Errors:**
- `422` — a field out of the 0–100 range, or `min_score > max_score`.
- `409` — either this `grade` already has a band, **or** the score range overlaps an existing band's range (message names the colliding band, e.g. `"Score range overlaps existing band 'F' (0-49)"`). An admin config screen should show this clearly — it means two bands would make some score ambiguous.

### `GET /grade-bands` — list all grade bands

**Requires `grade_bands:read`.**

No pagination. **Success — `200 OK`:**
```json
[
  { "id": 1, "min_score": 0, "max_score": 49, "grade": "F" },
  { "id": 8, "min_score": 80, "max_score": 100, "grade": "A" }
]
```
The currently-seeded defaults match the original design (`0-49 F`,
`50-55 D`, `56-59 D+`, `60-64 C`, `65-69 C+`, `70-74 B`, `75-79 B+`,
`80-100 A`) — but this is now real admin data, not a fixed rule, so
don't hardcode this table anywhere in the frontend; fetch it if you ever
need to display the scale (e.g. on the admin config screen itself).

### `PUT /grade-bands/{id}` — replace a grade band

**Requires `grade_bands:update`.** Same body shape as `POST` — all three
fields required.

**Request body:** `{ "min_score": 80, "max_score": 100, "grade": "A" }`

**Success — `200 OK`:** the updated band.

**Errors:** `422` — out of range, or `min_score > max_score`. `409` —
grade already used by a different band, **or** the new range overlaps a
*different* band (editing a band's range against its own unchanged
values never counts as a conflict with itself — only against others).
`404` — no band with that id.

### `PATCH /grade-bands/{id}` — partially update a grade band

**Requires `grade_bands:update`.** Send only what's changing, e.g.
`{ "max_score": 56 }` to nudge one boundary. The overlap and
`min_score ≤ max_score` checks still run — computed against whichever
fields you *didn't* send, taken from the band's current stored values.

**Errors:** same shapes as `PUT`.

### `DELETE /grade-bands/{id}` — remove a grade band

**Requires `grade_bands:delete`.** Safe with respect to existing marks —
a `Mark`'s `grade` is stored as the computed letter at the time it was
created, not a live reference to the band, so deleting a band never
breaks or changes any mark that already used it. It does, obviously,
leave a gap in score coverage going forward — a score that used to match
the deleted band's range will start failing marks entry with the
"no grade band configured" `422` until a replacement is added.

**Success — `204 No Content`.** **Errors:** `401`/`403` as above. `404`
— no band with that id.

---

## Marks entry (independent of registration — see TEAM_ROADMAP.md §2)

Staff enter a raw `score` (0–100). **The backend looks up the letter
`grade` itself from the admin-configured Grade Bands above** — never
send a `grade` in the request, it isn't accepted as input, and don't
hardcode the score→grade mapping client-side since it can change without
a deploy.

**Visibility rule you need to build around:** staff can see both `score`
and `grade`. A student must only ever see `grade` — never the numeric
`score`. This is now actually enforced by which endpoint you call, not
just a plan: `GET /students/{reg_number}/marks` (staff view, below)
always returns both fields, while the separate `GET /me/marks`
(student-only, further below) returns a shape that structurally has no
`score` field at all. **Build the student-facing "My Marks" screen
against `GET /me/marks`, never against `GET /students/{reg_number}/marks`
with the score hidden client-side** — the latter is exactly the kind of
frontend-only "security" the backend team has been deliberately avoiding
elsewhere in this API, and in this case there's a real, already-built
endpoint that does it properly instead.

### `POST /students/{reg_number}/marks` — submit a batch of marks

**Requires `marks:create`.**

**One request, however many mark rows the staff user added on screen.**

**Request body:**
```json
{
  "marks": [
    { "course_id": 1, "score": 85, "semester_id": 1 },
    { "course_id": 2, "score": 72, "semester_id": 1 }
  ]
}
```

| Field (per row) | Type | Required | Notes |
|---|---|---|---|
| course_id | number | yes | from `GET /courses` |
| score | number | yes | must be 0–100 |
| semester_id | number | yes | from `GET /semesters` — pick the current semester once for the whole screen and reuse it on every row, don't make the user pick it per row |

**Success — `201 Created`:** the full list of created mark objects, each
with its own `id`, `student_reg_number`, and the server-computed `grade`:
```json
[
  { "id": 1, "student_reg_number": "FCI-BSE-2026-0001", "course_id": 1, "score": 85, "grade": "A", "semester_id": 1 }
]
```

**Errors — read this carefully, it's an all-or-nothing endpoint:**
- `404` — the `reg_number` in the URL doesn't exist, or one of the `course_id`s / `semester_id`s in the batch doesn't exist (message names which one).
- `422` — a `score` outside 0–100, **or** no `GradeBand` covers that score (message: `"No grade band configured for score X — ask an admin to set one up"`) — this means Admin hasn't finished setting up the grading scale (see Grade Bands above). Show this message directly; there's nothing the staff user did wrong.
- `409` — **the entire batch is rejected**, not just the offending row, if any row duplicates a mark that already exists for that exact student + course + semester combination. This is a real database transaction: if you sent 5 rows and row 3 conflicts, **none** of the 5 are saved — including the 4 that were individually fine. On a `409`, re-show the whole form as failed and let the user fix and resubmit everything, don't assume partial success.

### `PUT /students/{reg_number}/marks/{mark_id}` — replace one mark

**Requires `marks:update`.** Full replace — all three fields required,
same shape as one row of the batch-create body above.

**Request body:** `{ "course_id": 1, "score": 75, "semester_id": 1 }`

**Success — `200 OK`:** the updated mark, with `grade` **recomputed**
from the new `score` — you never send `grade` yourself, on create or
update.

**Errors:** `404` — the `(reg_number, mark_id)` pair doesn't resolve to a
real mark (a real `mark_id` belonging to a *different* student also
returns `404` here, not `403` — from your perspective there's simply no
mark at that address), or the given `course_id`/`semester_id` doesn't
exist. `422` — score outside 0–100, or no grade band covers it. `409` —
this student already has a different mark for that exact course +
semester combination.

### `PATCH /students/{reg_number}/marks/{mark_id}` — partially update one mark

**Requires `marks:update`.** Send only the field(s) you're changing —
most commonly just `score` (fixing a typo):

**Request body:** `{ "score": 75 }`

**Success — `200 OK`:** the updated mark. `grade` is recomputed
automatically whenever `score` changes — verified live: patching a
score from `60` to `75` changed the stored `grade` from `"C"` to `"B+"`
with no other field touched.

**Errors:** same shapes as `PUT` above.

### `DELETE /students/{reg_number}/marks/{mark_id}` — remove one mark

**Requires `marks:delete`.** Staff does **not** have this permission by
default (only `create`/`read`/`update` — see the grant table at the top
of this file) — expect staff tokens to get `403` here even though they
can create and edit marks freely. This is deliberate, not a bug to work
around: correcting a mark is routine, deleting one is treated as a more
sensitive action reserved for Admin.

**Success — `204 No Content`.** **Errors:** `401`/`403` as above. `404`
if the `(reg_number, mark_id)` pair doesn't resolve to a real mark.

### `GET /students/{reg_number}/marks` — list a student's marks (staff view — includes score)

**Requires `marks:read`.**

Example: `GET /students/FCI-BSE-2026-0001/marks`

**Success — `200 OK`:** array of mark objects, same shape as the create
response (`score` and `grade` both included). **Errors:** `404` if the
student doesn't exist; `403` if you're logged in as a student and
`reg_number` isn't your own (checked **before** the `404`, so any
reg_number that isn't yours returns `403` whether or not it's real).

Useful for a staff user to confirm what they just entered. If you're
building the student-facing screen, use `GET /me/marks` below instead —
it returns the restricted, grade-only shape automatically.

### `GET /me/marks` — the student's own marks (student-only, grade only)

**Requires `marks:read` AND a `student`-role token** — the permission
check alone isn't enough here (a staff token also has `marks:read`, but
gets `403` on this specific endpoint since it isn't a student account).
No `reg_number` in the URL at all, it's always the logged-in student's
own record. This is intentionally a **different response shape** than
the endpoint above:
```json
[
  { "id": 1, "course_id": 1, "grade": "A", "semester_id": 2 }
]
```
**No `score` field — structurally, not just hidden.** Build the student
"My Marks" screen against this shape specifically; it will never contain
a numeric score to accidentally render.

**Errors:** `401` no token. `403` if the token isn't a student account.

---

## Admin Overview

### `GET /admin/overview` — everything, in one response

**Requires `overview:read`** (Admin only, by default). Built for an
admin dashboard that needs to show all the underlying data at a glance,
without firing off nine separate requests to `/staff`, `/faculties`,
`/programs`, etc. **No query params, no pagination** — returns every row
of every entity below.

**Success — `200 OK`:**
```json
{
  "staff": [ { "id": 1, "first_name": "...", ... } ],
  "faculties": [ { "id": 1, "code": "SCI", ... } ],
  "programs": [ { "id": 1, "code": "BSCS", ... } ],
  "courses": [ { "id": 1, "code": "CS101", ... } ],
  "semesters": [ { "id": 1, "academic_year": "2025/2026", ... } ],
  "grade_bands": [ { "id": 1, "min_score": 0, "max_score": 49, "grade": "F" } ],
  "students": [ { "reg_number": "...", ... } ],
  "marks": [ { "id": 1, "student_reg_number": "...", ... } ],
  "users": [ { "id": 1, "username": "Admin", "role": "admin", ... } ],
  "permissions": [ { "id": 1, "module": "staff", "action": "create" } ],
  "role_permissions": [ { "id": 1, "role": "admin", "permission_id": 1 } ]
}
```
Each array holds objects in exactly the same shape documented in that
entity's own section above — this endpoint doesn't invent a new shape,
it just bundles the existing ones together.

**Errors:** `401`/`403` per the auth section at the top of this file.

**A scale caveat worth knowing:** this endpoint has no pagination by
design (an overview needs "everything," not one page of it), which is
fine right now but will need revisiting if any of these lists grows
into the thousands — don't build the admin screen assuming this stays
cheap forever at any scale.

---

## Users & Authentication

Login exists for three kinds of accounts — Admin, Staff, Student —
sharing one `users` table and one login endpoint.

**`username` is never something a caller chooses for Staff/Student
accounts — it's derived automatically from data that's already
guaranteed unique.** A staff account's `username` is always that staff
member's own `email`; a student account's `username` is always their
own `reg_number`. Only an **Admin** account (no underlying profile to
derive anything from) has a freely-chosen `username`. This isn't
arbitrary — a real bug hit exactly this gap: two different people once
picked the identical username *and* password, and logging in as one
ended up authenticating the other's account instead. See
[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) §19 for the full
story and the fix. **Practical effect:** `POST /auth/login`'s
`username` field accepts an email (staff), a registration number
(student), or the literal admin username — never something you get to
invent at registration time.

### `POST /users` — create a login account

**Requires `users:create` permission** (Admin only, by default — see
the grant table above). One notable exception: **the very first Admin
account in a fresh system has to be created before any token exists to
authorize this call** — that bootstrap happened once, out-of-band, when
this backend was first set up. In normal operation, you must already be
logged in as someone with `users:create` to call this.

Three different shapes depending on `role` — send exactly the matching
reference field, and no other. Note `username` flips from **forbidden**
to **required** depending on role — it's the one field in this table
that isn't about `staff_id`/`student_reg_number`:

| role | Also required | Must NOT include |
|---|---|---|
| `"admin"` | `username` (freely chosen — nothing to derive it from) | `staff_id`, `student_reg_number` |
| `"staff"` | `staff_id` (an existing staff member's `id`) | `student_reg_number`, **`username`** (derived from that staff member's email) |
| `"student"` | `student_reg_number` (an existing student's `reg_number`) | `staff_id`, **`username`** (derived from that student's reg_number) |

**Request body examples:**
```json
{ "username": "Admin", "password": "Admin123", "role": "admin" }
```
```json
{ "password": "SomePass123", "role": "staff", "staff_id": 1 }
```
```json
{ "password": "SomePass123", "role": "student", "student_reg_number": "FCI-BSE-2026-0001" }
```

**Success — `201 Created`:** the account, **without** the password or its
hash — that field never appears in any response, by design. For the
staff example above (assuming `staff_id: 1` is `jane@example.com`):
```json
{ "id": 2, "username": "jane@example.com", "role": "staff", "staff_id": 1, "student_reg_number": null }
```

**Errors:**
- `401` — no/invalid token. `403` — logged in, but lacking `users:create`.
- `422` — a role/reference mismatch from the table above (e.g. `role: "staff"` with no `staff_id`, `role: "admin"` with no `username`, or `role: "staff"`/`"student"` with a `username` supplied anyway).
- `404` — the referenced `staff_id` or `student_reg_number` doesn't exist.
- `409` — the derived (or, for admin, chosen) `username` is already taken, **or** that staff member/student already has an account (each can only have one).

### `POST /auth/register/student` — a student sets up their own login

**No auth required — but this is step 6 of the bootstrap order at the
top of this file, not a starting point.** This is how a student who
already has a registered profile (created via `POST /students` by
staff — students never create their own profile, only their *login*)
sets up their own password, instead of Admin doing it for them
via `POST /users`. Calling this before the student's profile exists
always returns `404` — that's expected, not a bug; see "Getting started"
above if you're hitting this. Proves ownership by requiring the
student's own `reg_number` — anyone who knows it can currently claim the
account (see the caveat below).

**Request body:** `{ "reg_number": "FCI-BSE-2026-0001", "password": "KevinPass123" }` — no `username` field; the account's login identifier is always the `reg_number` itself (see the note at the top of this section for why).

**Success — `201 Created`:** logs the student in immediately — identical
shape to `POST /auth/login`'s response, so you can reuse the same
"store token, redirect to dashboard" code path after either:
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer", "role": "student", "last_name": "Otieno", "photo_url": null }
```
`photo_url` is always `null` on a brand-new account — there's no photo
to have yet. See "Profile Photo" below for adding one afterward.

**Errors:**
- `404` — no student exists with this `reg_number` (message tells them to contact their registrar — their profile has to exist first, created through the normal registration flow).
- `409` — this student already has an account (message suggests logging in instead).

### `POST /auth/register/staff` — a staff member sets up their own login

**No auth required — but this is step 4 of the bootstrap order at the
top of this file, not a starting point.** Same idea as the student
version, but proves ownership via the staff member's own registered
`email` instead of a reg_number (staff don't have one). Calling this
before Admin has created the matching `Staff` profile always returns
`404` — that's expected; see "Getting started" above if you're hitting
this while building a signup screen.

**Request body:** `{ "email": "jane@example.com", "password": "JanePass123" }` — no `username` field; the account's login identifier is always the `email` itself (see the note at the top of this section for why).

**Success — `201 Created`:** same `TokenOut` shape as login, `role: "staff"`.

**Errors:**
- `422` — `email` isn't shaped like an email address (e.g. missing `@`). This is only a **format** check ("does this look like an email"), not verification that the caller actually owns/can receive mail at that address — there's no confirmation-link or OTP step at all, by design (see the limitation noted below).
- `404` — no staff record has that email (they need to be added as staff by Admin first).
- `409` — that staff member already has an account.

**A known limitation worth knowing about, not a bug:** anyone who knows
a real `reg_number` or staff `email` can currently claim that account —
there's no verification step (an emailed confirmation link, an OTP)
proving the caller actually *is* that person. Fine for a learning
project at this stage; a production system would add a verification
step here before treating the account as claimed.

### `POST /auth/login` — log in, get a token

**No auth required** — this is how you get a token in the first place.

**The `username` field means different things per role** (see the note
at the top of this section): a staff member logs in with their **email**,
a student with their **reg_number**, Admin with the literal `"Admin"` (or
whatever an admin's chosen username actually is). One field, one login
screen — just label it "Email / Registration Number / Username" (or
similar) on the frontend rather than "Username" alone, so staff and
students aren't confused into typing something that doesn't exist.

**Request body:** `{ "username": "Admin", "password": "Admin123" }` — or, for a staff member: `{ "username": "jane@example.com", "password": "JanePass123" }` — or a student: `{ "username": "FCI-BSE-2026-0001", "password": "KevinPass123" }`

**Success — `200 OK`:**
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer", "role": "admin", "last_name": null, "photo_url": null }
```
Store `access_token` and attach it as `Authorization: Bearer <token>` on
every subsequent request — required now, not optional, for nearly
everything else in this file.

`last_name` is looked up from the linked `Staff`/`Student` profile (via
`staff_id`/`student_reg_number` on the account) — use it for a "Welcome
back, {last_name}" greeting right after login, no extra request needed.
**It's `null` for Admin** — an admin account has no linked profile at
all (see Phase 9's design note), so fall back to showing `username`
(`"Admin"`) when `last_name` is `null`.

`photo_url` is the account's current profile photo — render it directly
(e.g. as an `<img src>`), no extra request needed to show an avatar
right after login. `null` means no photo has been uploaded yet; show a
default/placeholder avatar in that case. See "Profile Photo" below.

**Errors:**
- `401` — wrong password, **or** the username doesn't exist at all. **Both cases return the identical message** (`"Invalid username or password"`) — this is deliberate (never let a login form reveal which usernames are real), so don't try to show a different message for "user not found" vs. "wrong password"; there's no way to tell them apart from the response, on purpose.

### `GET /auth/me` — who am I, and what can I do

**Requires a valid token** (any role — this is how the frontend
bootstraps its own permission-aware UI, described in full at the top of
this file).

**Success — `200 OK`:** see the full example at the top of this file
under "How to know what a logged-in user can do." Shape:
```json
{
  "id": 1, "username": "Admin", "role": "admin",
  "staff_id": null, "student_reg_number": null, "last_name": null,
  "photo_url": null,
  "permissions": [ { "id": 1, "module": "staff", "action": "create" }, ... ]
}
```
Same `last_name` and `photo_url` fields, with the same `null`-for-Admin/
`null`-until-uploaded behavior, as the login response above — useful if
you need to re-fetch the display name or avatar without forcing a fresh
login (e.g. after a page refresh where you kept the token but not the
login response).

**Errors:** `401` if the token is missing/invalid/expired.

---

## Profile Photo (any logged-in account — Admin, Staff, or Student)

One photo per account, stored in MongoDB GridFS (not Postgres — see
[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) §18 for why). These
three routes are the whole feature: upload/replace your own, delete your
own, and a public URL that serves the actual image bytes. There is no
`GET /me/photo` — the current `photo_url` is already handed to you by
`POST /auth/login`, `POST /auth/register/*`, and `GET /auth/me` (all
documented above), so a dedicated fetch is never needed.

### `PUT /me/photo` — upload or replace your own photo

**Requires `profile:update` permission** (granted to all three roles by
default). Uploads a new photo, replacing and permanently deleting any
existing one for this account. `multipart/form-data`, not JSON — the
field name is `file`.

**Request:** `multipart/form-data` with one field, `file`, an image.
Accepted content types: `image/jpeg`, `image/png`, `image/webp`,
`image/gif`. Max size: **5MB**.

```js
const form = new FormData();
form.append("file", fileInput.files[0]);
await fetch(`${BASE_URL}/me/photo`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}` }, // no Content-Type — the browser sets the multipart boundary itself
  body: form,
});
```

**Success — `200 OK`:**
```json
{ "photo_url": "https://sharita-beerier-reputably.ngrok-free.dev/files/66f1a2b3c4d5e6f7a8b9c0d1" }
```
Use this `photo_url` immediately to update the displayed avatar — no
need to re-fetch `/auth/me`.

**Errors:**
- `401` — no/invalid token.
- `422` — wrong content type (not one of the four listed above), or the file exceeds 5MB.

### `DELETE /me/photo` — remove your own photo

**Requires `profile:delete` permission** (granted to all three roles by
default). Deletes the stored image from GridFS and clears `photo_url`
back to `null`.

**Success:** `204 No Content`.

**Errors:**
- `401` — no/invalid token.
- `404` — this account has no photo to delete.

### `GET /files/{file_id}` — the actual image, publicly

**No auth required — deliberately.** This is what every `photo_url`
points at, and it's what you put directly in an `<img src>` — a browser
`<img>` tag can't attach an `Authorization` header, so this route has to
be reachable without one. The trade-off: **anyone who has a `photo_url`
can view that image**, with no ownership check. Don't construct these
URLs yourself — always use the `photo_url` a response already gave you.

```html
<img src={user.photo_url || "/default-avatar.png"} alt="Profile photo" />
```

**Success — `200 OK`:** the raw image bytes, with the correct
`Content-Type` (e.g. `image/png`).

**Errors:** `404` if `file_id` doesn't correspond to a stored file (e.g.
it was already deleted, or the id is malformed).

---

## Permissions & Role-Permissions (admin-only — this is what makes access dynamic)

These two endpoints are how Admin reshapes who-can-do-what **without a
backend deploy**. Everything requires `permissions:create`/`read`/`delete`
as noted — Staff and Student have none of these by default.

### `POST /permissions` — define a new permission

Rarely needed day-to-day (the 41 standard module/action pairs already
exist), but lets Admin define permissions for something new — e.g. a
future module this doc doesn't know about yet.

**Request body:** `{ "module": "library", "action": "create" }`
(`action` is one of `"create"`, `"read"`, `"update"`, `"delete"`.)

**Success — `201 Created`:** `{ "id": 42, "module": "library", "action": "create" }`

**Errors:** `401`/`403` as above. `422` invalid `action` value. `409` this exact module+action pair already exists.

### `GET /permissions` — list every permission that exists

**Success — `200 OK`:** the full catalog — use this to look up a
`permission_id` before granting it to a role (below).
```json
[ { "id": 1, "module": "staff", "action": "create" }, ... ]
```

### `POST /role-permissions` — grant a permission to a role

**This is the actual "give this role access" action.** This is what an
Admin screen for managing roles/permissions should call.

**Request body:** `{ "role": "student", "permission_id": 10 }`

**Success — `201 Created`:** `{ "id": 56, "role": "student", "permission_id": 10 }`

**Effect is immediate** — verified live: a student's already-issued
token went from `403` to `200` on a previously-blocked endpoint the
moment this call succeeded, no re-login needed, no backend restart.

**Errors:** `401`/`403` as above. `404` — `permission_id` doesn't exist. `409` — this role already has this permission.

### `GET /role-permissions` — list every current grant

**Success — `200 OK`:** the entire grant matrix as raw rows — this is
what the table at the top of this file summarizes in human-readable
form. Cross-reference `permission_id` against `GET /permissions` to know
what each row actually grants.
```json
[ { "id": 1, "role": "admin", "permission_id": 1 }, ... ]
```

### `DELETE /role-permissions/{grant_id}` — revoke a grant

Existed as a **deliberate, narrow exception** back when this was the
*only* `DELETE` endpoint in the whole API, built ahead of the rest of
Phase 5 — because a permission system that can only grant and never
revoke isn't really finished, so it couldn't wait. Every other entity
now has its own `DELETE` too (Phase 5, complete). Use the `id` from `GET
/role-permissions` (not the `permission_id`).

**Success — `204 No Content`.** **Errors:** `401`/`403` as above. `404` — no grant with that id.

---

## Error response shapes — two different shapes, handle both

This API returns errors in **two different shapes** depending on the type
of failure. Your error-handling code needs to account for both:

**1. Validation errors (`422`)** — `detail` is an **array** of objects,
one per invalid field:
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address: An email address must have an @-sign.",
      "input": "not-an-email"
    },
    {
      "type": "enum",
      "loc": ["body", "gender"],
      "msg": "Input should be 'male', 'female' or 'other'",
      "input": "unknown"
    }
  ]
}
```
`loc` tells you exactly which field failed (`loc[1]` is the field name) —
useful for showing the error next to the right form input rather than as
one generic banner.

**2. Business-rule errors (`404`, `409`)** — `detail` is a **plain
string**:
```json
{ "detail": "Staff not found" }
```
```json
{ "detail": "Email already registered" }
```
```json
{ "detail": "Faculty not found" }
```

A safe general pattern on the frontend:
```js
if (Array.isArray(errorBody.detail)) {
  // 422 — map over errorBody.detail, use .loc and .msg per field
} else {
  // 404 / 409 — errorBody.detail is a single message string
}
```

---

## Minimal fetch examples (web)

**Every one of these needs the token now** — a helper that attaches it
automatically is worth writing once and reusing everywhere, rather than
remembering the header on every call site:

```js
const API_BASE = "http://127.0.0.1:8000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token"); // or wherever you store it
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw { status: res.status, detail: data?.detail };
  return data;
}

async function login(username, password) {
  const result = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("access_token", result.access_token);
  return result; // { access_token, token_type, role, last_name }
}

async function getMe() {
  return apiFetch("/auth/me"); // { id, username, role, ..., permissions }
}

async function createStaff(payload) {
  return apiFetch("/staff", { method: "POST", body: JSON.stringify(payload) });
}

async function getProgramsForFaculty(facultyId) {
  return apiFetch(`/programs?faculty_id=${facultyId}`);
}
```

Handle `status === 401` from `apiFetch` globally (clear the stored token,
redirect to login) rather than in every call site individually — it'll
fire from almost any request once a token expires.

---

## What's next

Every entity now has full `POST`/`GET`/`PUT`/`PATCH`/`DELETE`, login
exists, every route enforces dynamic, data-driven permissions (Phase
10), and profile photos (Phase 8, see above) are live — see
[TEAM_ROADMAP.md](TEAM_ROADMAP.md) §8 for the full phase history and why
the order ended up the way it did. The roadmap is complete — this file
now documents the full, real API surface, not a moving target. Any
future addition still gets its own new section here before frontend
work starts against it — don't build UI against guessed shapes for
endpoints that don't exist yet.
