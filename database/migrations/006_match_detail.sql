-- 006_match_detail.sql
-- Tabla dedicada para alineaciones enriquecidas (endpoint /web/athletes/games/lineups).
-- Contiene members con name, athleteId, jerseyNumber, imageVersion, position,
-- formation, yardFormation (posicion en cancha), stats[] por jugador, ranking, heatMap.
-- El overview (game_overviews) solo trae IDs sin nombres; este endpoint los trae completos.

CREATE TABLE IF NOT EXISTS game_lineups (
  game_id     BIGINT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_lineups_updated_at ON game_lineups (updated_at DESC);
