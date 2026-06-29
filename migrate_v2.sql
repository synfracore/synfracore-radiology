-- Corrected migration for databases created before superadmin/security-question support.
-- Run with: wrangler d1 execute synfracore-db --remote --file=./migrate_v2.sql
--
-- SQLite can't modify a CHECK constraint with ALTER TABLE, so we rebuild the
-- users table: create a new one with the updated constraint + new columns,
-- copy existing rows across, drop the old table, rename the new one in.

PRAGMA foreign_keys=off;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'radiologist')),
  full_name TEXT NOT NULL,
  security_question TEXT,
  security_answer_hash TEXT,
  security_answer_salt TEXT,
  created_at INTEGER NOT NULL
);

INSERT INTO users_new (id, hospital_id, username, password_hash, salt, role, full_name, created_at)
SELECT id, hospital_id, username, password_hash, salt, role, full_name, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);

PRAGMA foreign_keys=on;

-- Promote your existing admin account to super-admin.
-- Replace 'Synfracore' below if you used a different username.
UPDATE users SET role = 'superadmin' WHERE username = 'Synfracore' OR username = 'synfracore';
