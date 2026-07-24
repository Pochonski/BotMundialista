-- 014_add_indexes.sql
-- Adds indexes that the codebase queries but didn't have FK/indexes for.
-- All of these are non-unique, so they're safe even if data already exists.

-- Critical: apuesta_selecciones.id_apuesta FK column without an index
-- was the most expensive pre-existing query gap.
CREATE INDEX IF NOT EXISTS idx_selecciones_apuesta_estado
  ON apuesta_selecciones (id_apuesta, estado);

-- Lookups by user with date ordering.
CREATE INDEX IF NOT EXISTS idx_historial_usuario_fecha
  ON historial_consultas (id_usuario, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_alias
  ON usuarios (alias);

CREATE INDEX IF NOT EXISTS idx_equipos_usuario_fecha
  ON equipos_seguidos (id_usuario, fecha_seguimiento DESC);

-- Composite user + creation timestamp
CREATE INDEX IF NOT EXISTS idx_apuestas_usuario_fecha
  ON apuestas (id_usuario, fecha_creacion DESC);

-- Partial index: only rows the live evaluator reads (open bets with a game).
CREATE INDEX IF NOT EXISTS idx_apuestas_abiertas_partido
  ON apuestas (fecha_creacion)
  WHERE estado = 'abierta' AND id_partido_api IS NOT NULL;

-- Games composite (competition + status + start_time): covers most
-- dashboard match listings.
CREATE INDEX IF NOT EXISTS idx_games_comp_status_start
  ON games (competition_id, status_group, start_time);

-- News filtered by scope+entity and ordered by publish date.
CREATE INDEX IF NOT EXISTS idx_news_scope_entity_publish
  ON news (scope, entity_id, publish_date DESC);

-- Trends scope+game lookups.
CREATE INDEX IF NOT EXISTS idx_trends_scope_game
  ON trends (scope, game_id);
