-- Migration for databases created before superadmin/security-question support.
-- Run with: wrangler d1 execute synfracore-db --remote --file=./migrate_v2.sql
-- Safe to run once. SQLite doesn't support modifying CHECK constraints directly,
-- so we just add the new columns — the original CHECK constraint on `role` is
-- not enforced strictly in SQLite by default for existing rows, but new code
-- only ever inserts 'superadmin' | 'admin' | 'radiologist' going forward.

ALTER TABLE users ADD COLUMN security_question TEXT;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;
ALTER TABLE users ADD COLUMN security_answer_salt TEXT;

-- Promote your existing "synfracore" admin account to super-admin.
-- Replace 'synfracore' below if you used a different username.
UPDATE users SET role = 'superadmin' WHERE username = 'Synfracore' OR username = 'synfracore';
