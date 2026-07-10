-- Adds the learned_phrases table used by the report pattern learner
-- (src/pipeline/patternLearner.js + functions/api/patterns/index.js) to
-- persist phrase frequencies across sessions.
-- Run with: wrangler d1 execute synfracore-db --remote --file=./migrate_v5.sql
--
-- Note: this was requested as migrate_v4.sql, but migrate_v4.sql already
-- exists in this repo (hospital letterhead columns, already applied) — so
-- this is migrate_v5.sql to avoid overwriting it.

CREATE TABLE IF NOT EXISTS learned_phrases (
  id TEXT PRIMARY KEY,
  modality TEXT NOT NULL,
  body_part TEXT NOT NULL,
  section TEXT NOT NULL,
  phrase TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phrase_unique
  ON learned_phrases(modality, body_part, section, phrase);
