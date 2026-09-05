-- System-configuration seed data: NOT test data, safe to re-run against
-- any fresh database (Render's, a new teammate's local Postgres, etc.).
-- Captures exactly what was bootstrapped by hand into the original local
-- database during development: the Admin account, the permission catalog,
-- the default role grants, and the grading scale.
--
-- Run against an EMPTY database, after the app has already created its
-- tables once (Base.metadata.create_all() does that on startup) — this
-- only inserts rows, it doesn't create any tables itself.
--
-- Example:
--   psql "<External or Internal Database URL>" -f seed.sql

-- ── Admin account ───────────────────────────────────────────────────
-- username/password are unchanged from the original bootstrap:
-- "Admin" / "Admin123" — change this password after first login on a
-- deployment anyone besides the team can reach.
INSERT INTO users (id, username, password_hash, role, staff_id, student_reg_number) VALUES
  (1, 'Admin', '$2b$12$0W4ChhS1jhL7N3/NSoNg7uhEUSXBdj8bHmApmSZ4rlmBBggBeBHge', 'ADMIN', NULL, NULL);
SELECT pg_catalog.setval('users_id_seq', 1, true);

-- ── Grading scale ────────────────────────────────────────────────────
INSERT INTO grade_bands (id, min_score, max_score, grade) VALUES
  (1, 0, 49, 'F'),
  (2, 50, 55, 'D'),
  (3, 56, 59, 'D_PLUS'),
  (4, 60, 64, 'C'),
  (5, 65, 69, 'C_PLUS'),
  (6, 70, 74, 'B'),
  (7, 75, 79, 'B_PLUS'),
  (8, 80, 100, 'A');
SELECT pg_catalog.setval('grade_bands_id_seq', 8, true);

-- ── Permission catalog (44 permissions across 11 modules) ───────────
INSERT INTO permissions (id, module, action) VALUES
  (1, 'staff', 'CREATE'), (2, 'staff', 'READ'), (3, 'staff', 'UPDATE'), (4, 'staff', 'DELETE'),
  (5, 'students', 'CREATE'), (6, 'students', 'READ'), (7, 'students', 'UPDATE'), (8, 'students', 'DELETE'),
  (9, 'faculties', 'CREATE'), (10, 'faculties', 'READ'), (11, 'faculties', 'UPDATE'), (12, 'faculties', 'DELETE'),
  (13, 'programs', 'CREATE'), (14, 'programs', 'READ'), (15, 'programs', 'UPDATE'), (16, 'programs', 'DELETE'),
  (17, 'courses', 'CREATE'), (18, 'courses', 'READ'), (19, 'courses', 'UPDATE'), (20, 'courses', 'DELETE'),
  (21, 'semesters', 'CREATE'), (22, 'semesters', 'READ'), (23, 'semesters', 'UPDATE'), (24, 'semesters', 'DELETE'),
  (25, 'grade_bands', 'CREATE'), (26, 'grade_bands', 'READ'), (27, 'grade_bands', 'UPDATE'), (28, 'grade_bands', 'DELETE'),
  (29, 'marks', 'CREATE'), (30, 'marks', 'READ'), (31, 'marks', 'UPDATE'), (32, 'marks', 'DELETE'),
  (33, 'users', 'CREATE'), (34, 'users', 'READ'), (35, 'users', 'UPDATE'), (36, 'users', 'DELETE'),
  (37, 'permissions', 'CREATE'), (38, 'permissions', 'READ'), (39, 'permissions', 'UPDATE'), (40, 'permissions', 'DELETE'),
  (41, 'overview', 'READ'),
  (42, 'profile', 'READ'), (43, 'profile', 'UPDATE'), (44, 'profile', 'DELETE');
SELECT pg_catalog.setval('permissions_id_seq', 44, true);

-- ── Default role grants ──────────────────────────────────────────────
-- Admin: everything. Staff: create/read/update on students+marks, read
-- on the metadata catalog, full profile access. Student: read own
-- marks/record, full profile access. See docs/API_REFERENCE.md's grant
-- table for the human-readable version of this.
INSERT INTO role_permissions (id, role, permission_id) VALUES
  (1, 'ADMIN', 1), (2, 'ADMIN', 2), (3, 'ADMIN', 3), (4, 'ADMIN', 4),
  (5, 'ADMIN', 5), (6, 'ADMIN', 6), (7, 'ADMIN', 7), (8, 'ADMIN', 8),
  (9, 'ADMIN', 9), (10, 'ADMIN', 10), (11, 'ADMIN', 11), (12, 'ADMIN', 12),
  (13, 'ADMIN', 13), (14, 'ADMIN', 14), (15, 'ADMIN', 15), (16, 'ADMIN', 16),
  (17, 'ADMIN', 17), (18, 'ADMIN', 18), (19, 'ADMIN', 19), (20, 'ADMIN', 20),
  (21, 'ADMIN', 21), (22, 'ADMIN', 22), (23, 'ADMIN', 23), (24, 'ADMIN', 24),
  (25, 'ADMIN', 25), (26, 'ADMIN', 26), (27, 'ADMIN', 27), (28, 'ADMIN', 28),
  (29, 'ADMIN', 29), (30, 'ADMIN', 30), (31, 'ADMIN', 31), (32, 'ADMIN', 32),
  (33, 'ADMIN', 33), (34, 'ADMIN', 34), (35, 'ADMIN', 35), (36, 'ADMIN', 36),
  (37, 'ADMIN', 37), (38, 'ADMIN', 38), (39, 'ADMIN', 39), (40, 'ADMIN', 40),
  (41, 'ADMIN', 41),
  (42, 'STAFF', 29), (43, 'STAFF', 30), (44, 'STAFF', 31),
  (45, 'STAFF', 5), (46, 'STAFF', 6), (47, 'STAFF', 7),
  (48, 'STAFF', 18), (49, 'STAFF', 10), (50, 'STAFF', 26),
  (51, 'STAFF', 14), (52, 'STAFF', 22), (53, 'STAFF', 2),
  (54, 'STUDENT', 30), (55, 'STUDENT', 6),
  (60, 'ADMIN', 42), (61, 'ADMIN', 43), (62, 'ADMIN', 44),
  (63, 'STAFF', 42), (64, 'STAFF', 43), (65, 'STAFF', 44),
  (66, 'STUDENT', 42), (67, 'STUDENT', 43), (68, 'STUDENT', 44);
SELECT pg_catalog.setval('role_permissions_id_seq', 68, true);
