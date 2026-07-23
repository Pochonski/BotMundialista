-- 010_history_enhancements.sql
-- Añadir columnas útiles a competition_history para soportar el shape
-- `table.rows` del upstream (campeón por temporada, valores agregados).

ALTER TABLE competition_history
  ADD COLUMN IF NOT EXISTS champion_entity_id INT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS values JSONB;

-- Crear índice para filtrar por campeón (top winners).
CREATE INDEX IF NOT EXISTS idx_competition_history_champion
  ON competition_history (champion_entity_id)
  WHERE champion_entity_id IS NOT NULL;

-- Índice por título para ordenamiento cronológico.
CREATE INDEX IF NOT EXISTS idx_competition_history_season_desc
  ON competition_history (competition_id, season_num DESC);
