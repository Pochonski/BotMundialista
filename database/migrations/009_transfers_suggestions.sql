-- 009_transfers_suggestions.sql
-- Tablas para cachear fichajes y sugerencias de partidos.
-- Habilitan el tab "Fichajes" en /competicion/:id y el endpoint
-- /competitions/:id/transfers (más rápido que pedir al upstream en cada request).

CREATE TABLE IF NOT EXISTS competition_transfers (
  competition_id  INT NOT NULL,
  transfer_id     BIGINT NOT NULL,
  athlete_id      BIGINT,
  origin_id       INT,
  target_id       INT,
  time            TIMESTAMPTZ,
  price           TEXT,
  position_id     INT,
  is_arrival      BOOLEAN NOT NULL DEFAULT FALSE,
  is_departure    BOOLEAN NOT NULL DEFAULT FALSE,
  status_id       INT,
  status_name     TEXT,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, transfer_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_comp_time
  ON competition_transfers (competition_id, time DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_transfers_origin
  ON competition_transfers (origin_id)
  WHERE origin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_target
  ON competition_transfers (target_id)
  WHERE target_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_athlete
  ON competition_transfers (athlete_id)
  WHERE athlete_id IS NOT NULL;

-- Sugerencias de partidos (top upcoming games con valor de apuesta).
CREATE TABLE IF NOT EXISTS game_suggestions (
  game_id         BIGINT PRIMARY KEY,
  competition_id  INT NOT NULL,
  rank            INT,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_suggestions_comp
  ON game_suggestions (competition_id, rank NULLS LAST);
