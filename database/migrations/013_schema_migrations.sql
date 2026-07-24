-- 013_schema_migrations.sql
-- Adds a tracking table so future migrations can be applied idempotently.

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Record already-applied migrations. We can't tell from this fresh
-- state which ones ran — but they did, so record everything <=012.
-- Future migrations 013+ will self-record via the runner.
INSERT INTO schema_migrations (name) VALUES
  ('002_scores365_state'),
  ('003_bet_followers'),
  ('004_scores365_data'),
  ('005_venues'),
  ('006_match_detail'),
  ('007_athletes_canonical'),
  ('008_active_competitions'),
  ('009_transfers_suggestions'),
  ('010_history_enhancements'),
  ('011_athletes_source'),
  ('012_competitors_name_trgm'),
  ('013_schema_migrations')
ON CONFLICT (name) DO NOTHING;
