-- Adds hospital letterhead fields (address, phone, logo) to an already-deployed
-- hospitals table. Run with: wrangler d1 execute synfracore-db --remote --file=./migrate_v4.sql
-- Plain ADD COLUMN statements (no CHECK constraint involved), so like
-- migrate_v3.sql this works directly without rebuilding the table.

ALTER TABLE hospitals ADD COLUMN address TEXT;
ALTER TABLE hospitals ADD COLUMN phone TEXT;
ALTER TABLE hospitals ADD COLUMN logo_data TEXT;
