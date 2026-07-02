-- 002_scores365_state.sql
-- Tracking de lastUpdateId por partido para el flujo de deltas de 365scores.

CREATE TABLE IF NOT EXISTS scores365_state (
  game_id          BIGINT PRIMARY KEY,
  competition_id   INT,
  sport_id         INT,
  home_competitor_id   INT,
  away_competitor_id   INT,
  last_update_id   BIGINT NOT NULL,
  last_snapshot    JSONB,
  last_status_text TEXT,
  last_game_time   NUMERIC,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores365_state_competition
  ON scores365_state (competition_id);

CREATE INDEX IF NOT EXISTS idx_scores365_state_updated_at
  ON scores365_state (updated_at DESC);
