-- Adds digital-signature and approval-tracking columns to an already-deployed reports table.
-- Run with: wrangler d1 execute synfracore-db --remote --file=./migrate_v3.sql
-- These are plain ADD COLUMN statements (no CHECK constraint involved), so unlike
-- migrate_v2.sql this one works directly without rebuilding the table.

ALTER TABLE reports ADD COLUMN signature_data TEXT;
ALTER TABLE reports ADD COLUMN approved_by TEXT;
ALTER TABLE reports ADD COLUMN approved_at INTEGER;
