-- 012_competitors_name_trgm.sql
-- Adds a trigram index on lower(name) for fast ILIKE / substring searches.
-- Used by mundialCache.getTeamByName() and similar name-based lookups.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_competitors_name_trgm
  ON competitors USING gin (lower(name) gin_trgm_ops);
