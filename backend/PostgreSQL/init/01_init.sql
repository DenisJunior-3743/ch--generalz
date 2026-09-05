-- Runs automatically the first time the container starts against an empty data volume.
-- Add your starter schema/seed data here.

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
