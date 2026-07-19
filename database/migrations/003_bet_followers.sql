-- 003_bet_followers.sql
-- Migración de Cosmos DB bet_followers a Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS bet_followers (
  ticket_id TEXT NOT NULL,
  game_id BIGINT,
  chat_ids TEXT[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'all_events',
  last_notified_status JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_bet_followers_game_id ON bet_followers (game_id);
CREATE INDEX IF NOT EXISTS idx_bet_followers_chat_ids ON bet_followers USING GIN (chat_ids);
