# Fase 3 — Modelo de datos (migraciones)

## Objetivo

Reestructurar el modelo de datos para representar correctamente las relaciones many-to-many, añadir las foreign keys que faltan, agregar índices críticos, normalizar tablas con arrays, y arreglar migraciones defectuosas. Esta fase es la más arriesgada porque toca el esquema.

**Esfuerzo**: 8-12 horas
**Riesgo**: Alto. Migraciones son delicadas — se recomienda staging DB.
**Impacto**: Muy alto a largo plazo. Resuelve la causa raíz de varios bugs y habilita optimizaciones.

---

## ⚠️ Pre-requisitos

- DB de staging con copia de datos reales (no apuntar a producción durante la primera ejecución).
- Snapshot antes de cada migration individual.
- Plan de rollback por migration.
- Disponibilidad de los datos para validar conteos.
- Backup completo `pg_dump` antes de empezar.

Si no tienes staging: considera fuertemente externalizar a un DBA o hacerlo en una ventana de mantenimiento extensa.

---

## Cambios

### 3.1 — Tabla `competition_competitors`

**Problema**: `competitors.competition_id` representa many-to-many como many-to-one. Equipos que juegan múltiples competiciones o cambian entre temporadas quedan mal asignados. Los filtros por `games` (introducido en `98f6828`) son solo un workaround de lectura.

**Archivo 1**: Nueva `database/migrations/013_competition_competitors.sql`

```sql
CREATE TABLE competition_competitors (
  competition_id INT NOT NULL,
  competitor_id INT NOT NULL,
  season_num INT NOT NULL,
  stage_num INT,
  group_id INT,
  source TEXT NOT NULL DEFAULT 'sync',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, competitor_id, season_num)
);

CREATE INDEX idx_cc_competitor_season
  ON competition_competitors (competitor_id, season_num DESC);

CREATE INDEX idx_cc_comp_season
  ON competition_competitors (competition_id, season_num DESC);

-- Backfill desde games
INSERT INTO competition_competitors (competition_id, competitor_id, season_num)
SELECT DISTINCT g.competition_id, g.home_competitor_id, g.season_num
FROM games g
WHERE g.home_competitor_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO competition_competitors (competition_id, competitor_id, season_num)
SELECT DISTINCT g.competition_id, g.away_competitor_id, g.season_num
FROM games g
WHERE g.away_competitor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill desde standings
INSERT INTO competition_competitors (competition_id, competitor_id, season_num)
SELECT DISTINCT s.competition_id, (s.data->>'id')::int, s.season_num
FROM standings s
WHERE s.data->>'id' IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Archivo 2**: Modificar `services/syncService.js`:
- `syncGamesForComp`: además del upsert a `games`, hacer upsert a `competition_competitors`:
  ```js
  await client.query(`
    INSERT INTO competition_competitors (competition_id, competitor_id, season_num)
    VALUES ($1, $2, $3)
    ON CONFLICT DO UPDATE SET last_seen_at = now()
  `, [g.competition_id, g.home_competitor_id, g.season_num]);
  ```
- `syncStandingsForComp`: igual.
- `syncCatalog` (competitors): al insertar un competitor nuevo, insertar también su fila en `competition_competitors` con el `season_num` que corresponda.

**Archivo 3**: Modificar `dashboard/server/controllers/transfersController.js` (líneas 100-115 aprox):
- Reemplazar filtro actual sobre `games` por uno sobre `competition_competitors`:
  ```sql
  AND cc.competitor_id IN (
    SELECT competitor_id FROM competition_competitors WHERE competition_id = $1
  )
  ```

**Archivo 4**: Modificar `dashboard/server/utils/competition.js`:
- Usar `competition_competitors` como fuente para resolver el `comp` y los equipos disponibles.

**Archivo 5**: Nueva `database/migrations/014_drop_competitors_competition_id.sql` (posterior, validar primero):
```sql
ALTER TABLE competitors DROP COLUMN competition_id;
```

EJECUTAR SOLO DESPUÉS de:
- Verificar que ningún endpoint lee `competitors.competition_id`
- Confirmar que `competition_competitors` está completa en coverage

---

### 3.2 — Foreign keys que faltan

**Archivo**: Nueva `database/migrations/015_add_foreign_keys.sql`

```sql
-- Usuarios
ALTER TABLE apuestas
  ADD CONSTRAINT apuestas_usuario_fk
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
  ON DELETE CASCADE;

ALTER TABLE equipos_seguidos
  ADD CONSTRAINT equipos_seguidos_usuario_fk
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
  ON DELETE CASCADE;

ALTER TABLE historial_consultas
  ADD CONSTRAINT historial_usuario_fk
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
  ON DELETE CASCADE;

-- Apuestas y derivados
ALTER TABLE bet_followers
  ADD CONSTRAINT bet_followers_apuesta_fk
  FOREIGN KEY (ticket_id) REFERENCES apuestas(id)
  ON DELETE CASCADE;

-- Games
ALTER TABLE games
  ADD CONSTRAINT games_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

ALTER TABLE games
  ADD CONSTRAINT games_home_fk
  FOREIGN KEY (home_competitor_id) REFERENCES competitors(id)
  ON DELETE SET NULL;

ALTER TABLE games
  ADD CONSTRAINT games_away_fk
  FOREIGN KEY (away_competitor_id) REFERENCES competitors(id)
  ON DELETE SET NULL;

-- Cache tables
ALTER TABLE news
  ADD CONSTRAINT news_game_fk
  FOREIGN KEY (game_id) REFERENCES games(id)
  ON DELETE CASCADE;

ALTER TABLE trends
  ADD CONSTRAINT trends_game_fk
  FOREIGN KEY (game_id) REFERENCES games(id)
  ON DELETE CASCADE;

-- Transfers
ALTER TABLE competition_transfers
  ADD CONSTRAINT transfers_athlete_fk
  FOREIGN KEY (athlete_id) REFERENCES athletes(id)
  ON DELETE SET NULL;

ALTER TABLE competition_transfers
  ADD CONSTRAINT transfers_origin_fk
  FOREIGN KEY (origin_id) REFERENCES competitors(id)
  ON DELETE SET NULL;

ALTER TABLE competition_transfers
  ADD CONSTRAINT transfers_target_fk
  FOREIGN KEY (target_id) REFERENCES competitors(id)
  ON DELETE SET NULL;

ALTER TABLE game_suggestions
  ADD CONSTRAINT suggestions_game_fk
  FOREIGN KEY (game_id) REFERENCES games(id)
  ON DELETE CASCADE;

ALTER TABLE game_suggestions
  ADD CONSTRAINT suggestions_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

-- Standings / brackets
ALTER TABLE standings
  ADD CONSTRAINT standings_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

ALTER TABLE brackets
  ADD CONSTRAINT brackets_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

ALTER TABLE tournament_stats
  ADD CONSTRAINT tournament_stats_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

ALTER TABLE team_of_week
  ADD CONSTRAINT team_of_week_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;

ALTER TABLE odds_outrights
  ADD CONSTRAINT odds_outrights_competition_fk
  FOREIGN KEY (competition_id) REFERENCES competitions(id)
  ON DELETE CASCADE;
```

**Cuidado**: validar primero que no hay rows huérfanas. Para cada FK usar:
```sql
SELECT COUNT(*) FROM apuestas WHERE id_usuario NOT IN (SELECT id FROM usuarios);
-- Si retorna >0, hay huérfanos que fallarían la FK.
```

Pre-validación con un script `tests/migrations/fk-validation.js` que cuenta huérfanos para cada tabla antes de aplicar.

---

### 3.3 — Índices pendientes

**Archivo**: Nueva `database/migrations/016_add_indexes.sql`

```sql
-- Críticos
CREATE INDEX idx_selecciones_apuesta_estado
  ON apuesta_selecciones (id_apuesta, estado);

ALTER TABLE apuesta_selecciones
  ALTER COLUMN id_apuesta SET NOT NULL;

CREATE INDEX idx_historial_usuario_fecha
  ON historial_consultas (id_usuario, fecha DESC);

CREATE INDEX idx_usuarios_alias
  ON usuarios (alias);

CREATE INDEX idx_equipos_usuario_fecha
  ON equipos_seguidos (id_usuario, fecha_seguimiento DESC);

CREATE INDEX idx_apuestas_usuario_fecha
  ON apuestas (id_usuario, fecha_creacion DESC);

CREATE INDEX idx_apuestas_abiertas_partido
  ON apuestas (fecha_creacion)
  WHERE estado = 'abierta' AND id_partido_api IS NOT NULL;

-- Para queries frecuentes
CREATE INDEX idx_games_comp_status_start
  ON games (competition_id, status_group, start_time);

CREATE INDEX idx_news_scope_entity_publish
  ON news (scope, entity_id, publish_date DESC);

CREATE INDEX idx_trends_scope_game
  ON trends (scope, game_id);

-- Trigrama para competidores (si ya no se hizo en 012)
CREATE INDEX IF NOT EXISTS idx_competitors_name_trgm
  ON competitors USING gin (lower(name) gin_trgm_ops);
```

Confirmar con EXPLAIN ANALYZE antes/después de las queries hot.

---

### 3.4 — Constraints CHECK

**Archivo**: Nueva `database/migrations/017_add_check_constraints.sql`

```sql
ALTER TABLE apuestas
  ADD CONSTRAINT apuestas_estado_check
  CHECK (estado IN ('abierta', 'cerrada', 'completada', 'anulada'));

ALTER TABLE apuestas
  ADD CONSTRAINT apuestas_ocr_confianza_range
  CHECK (confianza_ocr IS NULL OR (confianza_ocr >= 0 AND confianza_ocr <= 1));

ALTER TABLE apuesta_selecciones
  ADD CONSTRAINT selecciones_estado_check
  CHECK (estado IN ('pendiente', 'ganada', 'perdida', 'anulada', 'push'));

ALTER TABLE eventos_apuesta
  ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo_evento IN ('gol', 'corner', 'tarjeta_amarilla', 'tarjeta_roja', 'cambio', 'finalizado', 'iniciado'));

ALTER TABLE bet_followers
  ADD CONSTRAINT bet_followers_mode_check
  CHECK (mode IN ('all_events', 'outcome'));
```

Validar con datos actuales:
```sql
-- Para cada CHECK, hacer un SELECT que muestre valores fuera del enum
SELECT DISTINCT estado FROM apuestas;
-- Comparar contra los valores esperados
```

---

### 3.5 — `bet_followers` normalizado

**Archivo 1**: Nueva `database/migrations/018_bet_followers_v2.sql`

```sql
CREATE TABLE bet_followers_v2 (
  apuesta_id INT NOT NULL REFERENCES apuestas(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'all_events',
  last_notified_status JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (apuesta_id, chat_id, mode)
);

CREATE INDEX idx_bf_v2_chat ON bet_followers_v2 (chat_id);
CREATE INDEX idx_bf_v2_apuesta ON bet_followers_v2 (apuesta_id);

-- Migrar datos desde bet_followers (expandir array chat_ids)
INSERT INTO bet_followers_v2 (apuesta_id, chat_id, mode, last_notified_status, created_at, updated_at)
SELECT
  (bet_followers.ticket_id)::int AS apuesta_id,
  unnest(bet_followers.chat_ids) AS chat_id,
  bet_followers.mode,
  bet_followers.last_notified_status,
  bet_followers.created_at,
  bet_followers.updated_at
FROM bet_followers;
```

**Archivo 2**: Modificar `handlers/followHandler.js`:
- Reemplazar todas las queries a `bet_followers` por `bet_followers_v2`.
- Manejar insert con `INSERT … ON CONFLICT DO NOTHING` (PK compuesta ya incluye el modo).
- Decidir si usar `chat_id = $1` para match exacto de chat (ya no array).

**Archivo 3**: Modificar `services/betEvaluator.js`:
- Actualizar lectura/escritura a `bet_followers_v2`.
- La semántica de "modos múltiples para mismo ticket" ahora es una fila por modo, no una fila con `mode` column.

**Archivo 4**: Nueva `database/migrations/019_drop_old_bet_followers.sql` (posterior, validar primero):
```sql
DROP TABLE bet_followers;
```

EJECUTAR SOLO DESPUÉS de validar que todos los handlers están migrados.

---

### 3.6 — Arreglar migrations previas

**Archivo**: `database/migrations/007_athletes_canonical.sql` — reescribir para deduplicar antes del índice único:

```sql
-- Primero eliminar duplicados
DELETE FROM athletes a
USING athletes b
WHERE a.id > b.id
  AND a.canonical_id IS NOT NULL
  AND a.canonical_id = b.canonical_id;

-- Ahora sí, índice único
CREATE UNIQUE INDEX idx_athletes_canonical_id
  ON athletes (canonical_id)
  WHERE canonical_id IS NOT NULL;
```

**Archivo**: `database/migrations/004_scores365_data.sql` — reescribir seed para insertar primero el parent:

```sql
-- Insert parent antes de los aliases
INSERT INTO competitions (id, data, updated_at)
VALUES (5930, '{"name": "Mundial"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

-- Ahora sí los aliases
INSERT INTO competition_aliases (competition_id, alias) VALUES
  (5930, 'mundial'),
  ...
```

**Archivo**: Nueva `database/migrations/020_create_schema_migrations.sql`

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registrar todas las migraciones existentes como aplicadas
-- (Este paso se hace manualmente al implementar)
INSERT INTO schema_migrations (name) VALUES
  ('002_scores365_state'),
  ('003_bet_followers'),
  ...
  ('020_create_schema_migrations')
ON CONFLICT DO NOTHING;
```

Documentar nuevo procedimiento en `docs/migration-supabase-vercel.md`:
- Cada migration nueva debe añadir `INSERT INTO schema_migrations (name) VALUES ('NNN_name');` al final.
- El runner debe verificar que la entrada no exista antes de aplicar.

---

### 3.7 — Tablas `venues` y `eventos_apuesta`

Por instrucción del usuario, mantener hasta confirmar con producto. No tocar.

Anotar como resolución pendiente en `CHECKLIST.md`.

---

### 3.8 — Timezone en baseline tables

**Archivo**: Nueva `database/migrations/021_baseline_to_timestamptz.sql`

```sql
ALTER TABLE usuarios
  ALTER COLUMN fecha_registro TYPE TIMESTAMPTZ USING fecha_registro AT TIME ZONE 'UTC';

ALTER TABLE equipos_seguidos
  ALTER COLUMN fecha_seguimiento TYPE TIMESTAMPTZ USING fecha_seguimiento AT TIME ZONE 'UTC';

ALTER TABLE historial_consultas
  ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha AT TIME ZONE 'UTC';

ALTER TABLE apuestas
  ALTER COLUMN fecha_creacion TYPE TIMESTAMPTZ USING fecha_creacion AT TIME ZONE 'UTC',
  ALTER COLUMN fecha_partido TYPE TIMESTAMPTZ USING fecha_partido AT TIME ZONE 'UTC',
  ALTER COLUMN fecha_cierre TYPE TIMESTAMPTZ USING fecha_cierre AT TIME ZONE 'UTC';

ALTER TABLE eventos_apuesta
  ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha AT TIME ZONE 'UTC';
```

Pre-validar:
```sql
SELECT MIN(fecha) FROM historial_consultas;
-- Verificar que los timestamps son razonables
```

---

## Tests a añadir

| Archivo | Tipo | Cubre |
|---|---|---|
| `tests/migrations/fk-validation.js` | Pre-migration | 3.2 — cuenta huérfanos |
| `tests/migrations/013_cc_backfill.test.js` | Migration | 3.1 — backfill completo |
| `tests/integration/competitors-cc-query.test.js` | Integration | 3.1 — queries equivalentes |
| `tests/follow/followHandler.betFollowersV2.test.js` | Unit | 3.5 — handlers migrados |
| `tests/migrations/020_schema_migrations.test.js` | Migration | 3.6 — tabla existe y tracking funciona |

## Criterio de aceptación

- [ ] `competitors.competition_id` ya no se usa en código (verificado con grep)
- [ ] Cualquier intento de insertar orphan (sin parent FK) falla con constraint violation
- [ ] `bet_followers` antigua no tiene filas (verificar 0 count antes de DROP)
- [ ] Todas las migrations nuevas se registran en `schema_migrations`
- [ ] Bots y admin panel siguen funcionando tras las migraciones (test de regresión manual)

## Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Agregar FKs falla por huérfanos | Pre-validar counts; limpiar huérfanos manualmente antes de aplicar |
| Eliminar `competitors.competition_id` rompe Vercel cache que aún no se desplegó | Mantener columna como `GENERATED ALWAYS AS (...) STORED` durante un ciclo, luego eliminar en siguiente migration |
| Normalizar `bet_followers` rompe notificaciones | Feature flag: leer de ambas tablas, escribir solo a la nueva |
| Migraciones aplicadas en orden equivocado por error humano | Crear runner (`scripts/migrate.js`) que aplica en orden y verifica schema_migrations |
| Cambiar TIMESTAMPTZ desplaza fechas existentes | Validar con queries de muestra antes y después; documentar el offset |

## Plan de rollback por migration

Para cada migration (`013`, `015`, `016`, `017`, `018`, `019`, `021`) crear script inverso equivalente:

```
013_drop_competition_competitors.sql
015_drop_foreign_keys.sql
016_drop_indexes.sql
017_drop_check_constraints.sql
018_drop_bet_followers_v2.sql
019_recreate_bet_followers.sql
021_revert_timestamptz.sql
```

Estos NO se aplican automáticamente; sirven como guía si una migración falla a medio aplicar y se necesita restaurar.
