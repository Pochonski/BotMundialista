-- 005_venues.sql
-- Estadios/sedes del Mundial, extraídos de game_overviews.

CREATE TABLE IF NOT EXISTS venues (
  id            INT PRIMARY KEY,
  name          TEXT,
  city          TEXT,
  country_id    INT,
  capacity      INT,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_city ON venues (city);
