-- SynfraCore Radiology — D1 schema
-- Run with: wrangler d1 execute synfracore-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
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
  created_at INTEGER NOT NULL,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT,
  patient_age TEXT,
  patient_gender TEXT,
  modality TEXT,
  study TEXT,
  clinical_history TEXT,
  dictated_text TEXT,
  draft_text TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  signature_data TEXT,
  approved_by TEXT,
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reports_hospital ON reports(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
