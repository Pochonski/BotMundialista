-- 018_competition_competitors.sql
-- Tabla junction many-to-many: un equipo puede participar en múltiples competiciones
-- al mismo tiempo (ej. Manchester City en PL + Champions). El campo
-- `competitors.competition_id` está mal como one-to-many y DeepSeek lo notó
-- (refs: Phase 3 análisis).
--
-- La nueva tabla:
--  - No pisa data existente, solo se agrega.
--  - Backfill inicial desde `games` (un equipo participa si fue home o away
--    en al menos un partido de la competición esa temporada).
--  - Backfill secundario desde `standings` (cubre equipos con tabla pero
--    sin partidos futuros aún).

CREATE TABLE competition_competitors (
  competition_id INT NOT NULL,
  competitor_id  INT NOT NULL,
  season_num     INT NOT NULL,
  stage_num      INT,
  group_id       INT,
  source         TEXT NOT NULL DEFAULT 'games'
                  CHECK (source IN ('games', 'standings', 'manual', 'sync')),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, competitor_id, season_num)
);

-- Lookups rápidos: por equipo y temporada (lo más común para transferir
-- detalle de un equipo a sus competiciones).
CREATE INDEX idx_cc_competitor_season
  ON competition_competitors (competitor_id, season_num DESC);

CREATE INDEX idx_cc_comp_season
  ON competition_competitors (competition_id, season_num DESC);

-- Backfill desde games (un equipo participa si fue home o away al menos una vez).
INSERT INTO competition_competitors (competition_id, competitor_id, season_num, source)
SELECT DISTINCT g.competition_id, g.home_competitor_id, g.season_num, 'games'
  FROM games g
  WHERE g.competition_id IS NOT NULL
    AND g.home_competitor_id IS NOT NULL
    AND g.season_num IS NOT NULL
ON CONFLICT (competition_id, competitor_id, season_num) DO NOTHING;

INSERT INTO competition_competitors (competition_id, competitor_id, season_num, source)
SELECT DISTINCT g.competition_id, g.away_competitor_id, g.season_num, 'games'
  FROM games g
  WHERE g.competition_id IS NOT NULL
    AND g.away_competitor_id IS NOT NULL
    AND g.season_num IS NOT NULL
ON CONFLICT (competition_id, competitor_id, season_num) DO NOTHING;

-- Backfill desde standings (ids únicos dentro de data->>rows[].competitor.id).
INSERT INTO competition_competitors (competition_id, competitor_id, season_num, source)
SELECT DISTINCT s.competition_id,
       (row.competitor->>'id')::int,
       s.season_num,
       'standings'
  FROM standings s,
       LATERAL jsonb_array_elements(COALESCE(s.data->'standings', '[]'::jsonb)) AS stage,
       LATERAL jsonb_array_elements(COALESCE(stage->'rows', '[]'::jsonb)) AS row
  WHERE (row.competitor->>'id') IS NOT NULL
    AND (row.competitor->>'id') ~ '^[0-9]+$'
ON CONFLICT (competition_id, competitor_id, season_num) DO NOTHING;

-- Refresh del last_seen_at post-backfill para indicar "este es el estado real".
UPDATE competition_competitors SET last_seen_at = now();
