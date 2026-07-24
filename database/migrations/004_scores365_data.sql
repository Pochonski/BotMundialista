-- 004_scores365_data.sql
-- Tablas para datos de 365scores, sincronizados por syncService.js.
-- Cada tabla almacena la respuesta cruda de la API en data JSONB
-- más columnas indexadas para consultas rápidas desde dashboard y bot.

-- =============================================
-- Catálogos (cambian poco, sync cada 6h)
-- =============================================

CREATE TABLE IF NOT EXISTS competitions (
  id            INT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitors (
  id              INT PRIMARY KEY,
  competition_id  INT,
  name            TEXT,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_name ON competitors (name);
CREATE INDEX IF NOT EXISTS idx_competitors_competition ON competitors (competition_id);

CREATE TABLE IF NOT EXISTS countries (
  id         INT PRIMARY KEY,
  name       TEXT,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Partidos (tabla principal, sync más frecuente)
-- =============================================

CREATE TABLE IF NOT EXISTS games (
  id                  BIGINT PRIMARY KEY,
  competition_id      INT,
  status_group        INT,
  status_text         TEXT,
  start_time          TIMESTAMPTZ,
  home_competitor_id  INT,
  away_competitor_id  INT,
  home_score          INT,
  away_score          INT,
  stage               INT,
  season_num          INT,
  data                JSONB NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_competition ON games (competition_id);
CREATE INDEX IF NOT EXISTS idx_games_status_group ON games (status_group);
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games (start_time DESC);
CREATE INDEX IF NOT EXISTS idx_games_home_competitor ON games (home_competitor_id);
CREATE INDEX IF NOT EXISTS idx_games_away_competitor ON games (away_competitor_id);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games (updated_at DESC);

-- =============================================
-- Standings y brackets
-- =============================================

CREATE TABLE IF NOT EXISTS standings (
  id              SERIAL PRIMARY KEY,
  competition_id  INT NOT NULL,
  stage_num       INT NOT NULL,
  season_num      INT NOT NULL,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, stage_num, season_num)
);

CREATE INDEX IF NOT EXISTS idx_standings_competition ON standings (competition_id);

CREATE TABLE IF NOT EXISTS brackets (
  competition_id  INT PRIMARY KEY,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Estadísticas de torneo
-- =============================================

CREATE TABLE IF NOT EXISTS tournament_stats (
  id              SERIAL PRIMARY KEY,
  competition_id  INT NOT NULL,
  season_num      INT NOT NULL,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, season_num)
);

CREATE TABLE IF NOT EXISTS team_of_week (
  competition_id  INT PRIMARY KEY,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competition_history (
  competition_id  INT NOT NULL,
  season_num      INT NOT NULL,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, season_num)
);

-- =============================================
-- Noticias
-- =============================================

CREATE TABLE IF NOT EXISTS news (
  id              BIGINT PRIMARY KEY,
  scope           TEXT NOT NULL,
  entity_id       INT NOT NULL,
  game_id         BIGINT,
  publish_date    TIMESTAMPTZ,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_scope_entity ON news (scope, entity_id);
CREATE INDEX IF NOT EXISTS idx_news_game ON news (game_id);
CREATE INDEX IF NOT EXISTS idx_news_publish_date ON news (publish_date DESC);

-- =============================================
-- Tendencias (trends)
-- =============================================

CREATE TABLE IF NOT EXISTS trends (
  id              SERIAL PRIMARY KEY,
  scope           TEXT NOT NULL,
  entity_id       INT NOT NULL,
  game_id         BIGINT,
  line_type_id    INT,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trends_scope_entity ON trends (scope, entity_id);
CREATE INDEX IF NOT EXISTS idx_trends_game ON trends (game_id);

-- =============================================
-- Predicciones
-- =============================================

CREATE TABLE IF NOT EXISTS predictions (
  game_id       BIGINT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Líneas de apuestas
-- =============================================

CREATE TABLE IF NOT EXISTS odds_lines (
  game_id       BIGINT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS odds_outrights (
  competition_id  INT PRIMARY KEY,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Detalle de partidos (overview, h2h, pre-stats, live stats)
-- =============================================

CREATE TABLE IF NOT EXISTS game_overviews (
  game_id       BIGINT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_h2h (
  game_id       BIGINT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_pre_stats (
  game_id       BIGINT PRIMARY KEY,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_stats (
  game_id         BIGINT PRIMARY KEY,
  last_update_id  BIGINT NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Atletas / jugadores
-- =============================================

CREATE TABLE IF NOT EXISTS athletes (
  id            INT PRIMARY KEY,
  name          TEXT,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athletes_name ON athletes (name);

-- =============================================
-- Aliases para detección de competencias
-- =============================================

CREATE TABLE IF NOT EXISTS competition_aliases (
  competition_id INT NOT NULL REFERENCES competitions(id),
  alias          TEXT NOT NULL,
  PRIMARY KEY (competition_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_comp_alias ON competition_aliases (alias);

-- Aliases por defecto. Importante: las filas padre deben existir ANTES de
-- insertar aliases. Si recién corres migrations en una DB fresca, el sync
-- de catálogo no habrá poblado `competitions` aún, por lo que estos
-- inserts fallarían por FK. La solución es inyectar un row stub para
-- 5930 que el sync posterior enriquecerá.
INSERT INTO competitions (id, data, updated_at)
VALUES (5930, '{"name":"Mundial","_stub":true}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO competition_aliases (competition_id, alias) VALUES
  (5930, 'mundial'),
  (5930, 'mundial 2026'),
  (5930, 'world cup'),
  (5930, 'wc'),
  (5930, 'copa del mundo')
ON CONFLICT DO NOTHING;
