-- 011_athletes_source.sql
-- Adds a `source` column to `athletes` to distinguish the provenance of each row.
-- Prevents the sync process from accidentally destroying canonical, hydrated
-- profiles by overwriting them with a roster-light row from a lineup sync.

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalog';

-- Allowed values:
--   catalog = the canonical full profile (sportsdata, lineup, etc.)
--   roster  = a row from a game lineup (members[*])
--   transfer = a row from a transfer listing
--   profile = a manually upserted profile (admin, hydration result, etc.)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'athletes_source_check'
  ) THEN
    ALTER TABLE athletes
      ADD CONSTRAINT athletes_source_check
      CHECK (source IN ('catalog', 'roster', 'transfer', 'profile'));
  END IF;
END
$$;

COMMENT ON COLUMN athletes.source IS
  'Origin of the row. catalog = full profile, roster = lineup member, transfer = transfer listing, profile = manual upsert.';
