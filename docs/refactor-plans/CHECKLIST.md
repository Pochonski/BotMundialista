# Checklist de refactorización ScoreHub

Usa este checklist para tildar items a medida que avanzas. Cada sección corresponde a una fase. Marcar con `[x]` cuando completado y añadir comentario si encuentras desviación del plan.

---

## 📌 Fase 1 — Estabilizar lo existente

> Plan: [01-stabilize-current-state.md](./01-stabilize-current-state.md)

### 1.1 — `TeamDetailPage.tsx`: respetar Rules of Hooks
- [x] Identificar el `useMemo(formStats)` problemático (líneas 73-85)
- [x] Eliminar el hook (calcular inline como variable)
- [x] Probar navegación a `/equipo/:id` sin error #310
- [x] Commit (`984bdcd`)

### 1.2 — `transfersController.js`: corregir agregación summary
- [x] Reescribir SQL con CTE + UNION ALL
- [x] Mantener el filtro por `games` (intacto del fix anterior)
- [x] Test: origen ≠ destino suma correcto
- [x] Commit (`bfb3e2b`)

### 1.3 — `liveGamesPoller.js`: multi-comp + fix away goals
- [x] Investigar payload de `getGameStats` para separar home/away goals (goles vienen en `homeCompetitor.score` / `awayCompetitor.score`)
- [x] Reemplazar `COMPETITION_ID = 5930` por iteración con `forEachActive`
- [x] Corregir rama duplicada de away goals
- [x] Eliminar `getCompetitorScore` si es código muerto (queda como deprecated helper)
- [x] Commit (`0f2a93e`)

### 1.4 — `athleteController.js`: reconectar `AbortController.signal`
- [x] Pasar `signal` a `api.getAthlete()` (vía opción `opts.signal` en `scores365Service.get`)
- [x] Eliminar `HYDRATE_RETRIES` (declarado pero no usado)
- [x] Verificar firma real de `getAthlete` (ahora acepta `opts`)
- [x] Test actualizado
- [x] Commit (`e01e3ab`)

### 1.5 — `telegramBot.js`: `telegramRequest` rechaza `ok:false`
- [x] Modificar `telegramRequest` para rechazar cualquier `ok:false` con `Error` anotado
- [x] Añadir fallback a plain text en `sendMessage`/`sendPhoto` cuando `markdownIssue=true`
- [x] Revisar propagación de errores en handlers
- [x] Monitorear logs por algunas horas post-deploy
- [x] Commit (`06db50f`)

### Validación Fase 1
- [x] Build pasa
- [x] Tests pasan (99/99 dashboard, 26/27 server con único test pre-existente del health)
- [x] Lint pasa (0 errores)
- [x] Deploy a Vercel OK
- [x] Health endpoint reporta OK
- [x] `/api/football/competitions/7/transfers/summary` devuelve números correctos en prod (Aston Villa 8/7, antes 7/7)

---

## 📌 Fase 2 — Integridad de datos en sync

> Plan: [02-sync-data-integrity.md](./02-sync-data-integrity.md)

### 2.1 — Helpers de upsert diferenciados
- [x] Crear `upsertCompetitorCanonical()` en `syncService.js`
- [x] Crear `upsertCompetitorReference()`
- [x] Crear `upsertAthleteCanonical()`
- [x] Crear `upsertRosterMembership()`
- [x] Aplicar en sync paths relevantes
- [x] Documentar criterio "canónico"
- [x] Commit (`8f51dcc`)

### 2.2 — Transacciones en pares DELETE+INSERT
- [x] Crear helper `withTransaction(fn)` en `connection.js`
- [x] Envolver `syncTransfersForComp`
- [x] Envolver `syncSuggestionsForComp`
- [x] Envolver `syncTrendsForComp`
- [x] Envolver `syncCatalog` (competitors)
- [x] Envolver `syncAthletes` (roster + hidratación individual)
- [x] Test ad-hoc de rollback (count antes/después de throw)
- [x] Commit (`4ac76ef`)

### 2.3 — Columna `source` en `athletes`
- [x] Migration `011_athletes_source.sql` aplicada
- [x] Enum check constraint
- [x] Set source correctamente en cada sync path
- [x] Verificar que roster sync no destruye profiles
- [x] Commit (parte de `254bddd`)

### 2.4 — `getTeamByName` con query indexada
- [x] Reescribir `mundialCache.js#getTeamByName` con trigram
- [x] Migration `012_competitors_name_trgm.sql`
- [x] Fallback acotado a 120 días
- [x] Commit (`05989c4`)

### 2.5 — Logger estructurado en `syncService.js`
- [x] Reemplazar `console.log` por `utils/logger`
- [x] `syncRunId` por `syncAll()`
- [x] Errores en nivel `error` (`logErr`)
- [x] Commit (`8f51dcc` principal + `4aa1b1a` fix de destructuring)

### Validación Fase 2
- [x] Smoke test: un sync completo no rompe
- [x] Smoke test: matar sync a mitad → la DB no queda con huecos (rollback verificado)
- [x] Health endpoint reporta OK
- [x] Logs JSON en producción
- [x] Issues encontrados: documentados en commits

---

## 📌 Fase 3 — Modelo de datos (migraciones)

> Plan: [03-data-model.md](./03-data-model.md)

### Pre-requisitos Fase 3
- [x] Pre-validación de huérfanos en FKs candidatas (17 huérfanos encontrados)
- [x] Backfill de 5 competidores faltantes desde `games.data` JSONB
- [x] Limpieza de 15 huérfanos en cache (game_stats, odds_lines)
- [x] Tablas con CHECK vacías (apuestas, selecciones, eventos) — sin riesgo

### 3.1 — Tabla `competition_competitors` junction
- [x] Crear `018_competition_competitors.sql` (Phase 5)
- [x] Backfill desde `games.standings`
- [x] Modificar `syncGamesForComp`, `syncStandingsForComp`, `syncCatalog` (Phase 5)
- [x] Modificar `transfersController.js` para usar la nueva tabla
- [x] Modificar `teamController.js` para usar la nueva tabla
- [x] Commit (`2719497`, `79b5c9b`)

### 3.2 — Foreign keys
- [x] Pre-validar huérfanos para cada FK
- [x] Crear `016_foreign_keys.sql` con 3 FKs seguras (apuestas, equipos_seguidos, historial → usuarios)
- [x] Commit (parte de `983bc2a`)
- [ ] SKIPPED: FKs en cache tables (game_stats, news, etc.) por riesgo de orden en sync

### 3.3 — Índices pendientes
- [x] Crear `014_add_indexes.sql` con 9 índices
- [x] Tests de performance
- [x] Commit (parte de `983bc2a`)

### 3.4 — Constraints CHECK
- [x] Pre-validar valores fuera del CHECK
- [x] Crear `015_check_constraints.sql`
- [x] Commit (parte de `983bc2a`)

### 3.5 — `bet_followers` normalizado
- [ ] DEFERIDO: refactor handlers completo. Esperar a iter futura.

### 3.6 — Arreglar migrations previas
- [x] Reescribir `007_athletes_canonical.sql` para deduplicar primero
- [x] Reescribir `004_scores365_data.sql` con parent first
- [x] Crear `013_schema_migrations.sql` (tracking table)
- [x] Documentar procedimiento en `migration-supabase-vercel.md`
- [x] Commit (parte de `983bc2a`)

### 3.7 — `venues` y `eventos_apuesta`
- [ ] PENDIENTE DE CONFIRMACIÓN — no tocar por instrucción del usuario

### 3.8 — Timezone en baseline tables
- [x] Pre-validar fechas existentes
- [x] Crear `017_baseline_to_timestamptz.sql`
- [x] Commit (parte de `983bc2a`)

### Validación Fase 3
- [x] Tests completos pasan
- [x] Anotar issues encontrados

---

## 📌 Fase 4 — Migración a Supabase JS (HTTP)

> Plan: [04-supabase-js-migration.md](./04-supabase-js-migration.md)

### Pre-requisitos Fase 4
- [ ] PENDIENTE: Añadir `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel como env vars para activar el path HTTP

### 4.0 — Decisión arquitectónica
- [x] Estrategia dual con fallback: si SUPABASE_URL no seteado → wrapper hace fallback a pg automáticamente
- [x] dbStats expuesto vía health

### 4.1 — Capa de abstracción
- [x] Crear `database/supabaseClient.js`
- [x] Crear `database/db.js` con helpers
- [x] Reducir `database/connection.js` a pg-only con `max: 1`
- [x] Commit (`e4e10fd`)

### 4.2 — Refactor de repositories y servicios
- [x] Todos los controllers migrados en Phase 5:
  - infoController, standingController, transfersController
  - newsController, statsController, trendController
  - teamController, teamEnhancementsController, historyController
  - athleteController, matchController

### 4.3 — Estrategia dual
- [x] Queries complejas (CTE, JOINs 3+ tablas, JSONB casts) usan `db.execAdvanced` (pg)
- [x] Queries single-table con `eq`, `in`, `order`, `limit`, `maybeSingle` usan `db.query` (HTTP)

### 4.4 — Settings de Vercel
- [ ] PENDIENTE: añadir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en env de Vercel

### 4.5 — Observabilidad
- [x] `utils/dbStats.js`
- [x] Health endpoint reporta `dbStrategy` + `dbStats`

### 4.6 — Caché y migración de handlers/sync
- [x] Services: mundialCache, syncService, betEvaluator, betTrackingEngine, competitionName, matchSearch, notificationService, teamAliases, syncCompetitions
- [x] Handlers: messageHandler, followHandler, teamHandler, mundialista365Handler, mundialistaStatsHandler, betImageHandler
- [x] Utils: userStorage (setAlias + clearUserData)

### Validación Fase 4 + 5
- [x] Tests pasan (con único test pre-existente del health)
- [x] TypeScript limpio
- [x] Lint 0 errores, 22 warnings preexistentes
- [x] Build OK
- [x] Deploy a producción OK con `dbStrategy: "http+pg-fallback"`
- [x] Endpoints verificados: comps, featured, detail, standings, transfer summary, transfers (100 items), topScorers, trends, insights
- [x] dbStats con pgErrors=0 (logger destructuring fix verificado)

---

## 📌 Fase 5 — Cierre del refactor

> Plan: ya cubierto por Fases 1-4

### 5.1 — Migration 018 competition_competitors
- [x] Crear `database/migrations/018_competition_competitors.sql`
- [x] Backfill desde `games` (264 filas, 7 competiciones)
- [x] syncService.js mantiene la tabla via `upsertCompetitionCompetitorsFromGames` y `upsertCompetitionCompetitorsFromStandings`

### 5.2 — Migration de controllers a db wrapper
- [x] transfersController usa `competition_competitors` en lugar de `games`
- [x] teamController usa `competition_competitors`
- [x] matchController migrado con helper `getGameDetailBy` que maneja correctamente `games` (usa `id`) vs otras (usa `game_id`)

### 5.3 — Bug fixes post-deploy
- [x] Destructure de `{ rows }`/`{ rows: name }` corregido en 29 sitios (Phase 5 wrapper returns array directo, no `{rows: ...}`)
- [x] `database/db.js` logger destructuring fix: `utils/logger.js` exports la instancia directa, no un objeto con `logger`
- [x] `matchController.getGameDetailBy` return shape: ahora unwraps `data?.data` al JSONB content

### 5.4 — Validación final
- [x] Match detail test (Arsenal vs Coventry)
- [x] Match predictions test (Arsenal 82%)
- [x] Transfer summary via junction (`competition_competitors`)
- [x] Insights bundle (todos los componentes)

---

## 📌 Estado global

| Fase | Items completados | Items pendientes | Estado |
|---|---|---|---|
| 1 | 5/5 | — | ✅ |
| 2 | 5/5 | — | ✅ |
| 3 | 7/8 (junction table + FKs + indexes + CHECKs + TIMESTAMPTZ) | 1 (`bet_followers_v2`) | ✅ |
| 4 | 6/6 (todos los controllers migrados, dual strategy) | 1 (env vars Vercel) | ✅ |
| 5 | 4/4 (closure + bug fixes) | — | ✅ |

**Total commits post-refactor**: 18

**Próximos pasos opcionales:**
1. Activar Supabase JS en prod con `SUPABASE_URL` + `SERVICE_ROLE_KEY` — medible vía `dbStats` health endpoint
2. Migration 019 para normalizar `bet_followers_v2`
3. Eliminar warnings de ESLint acumulados (19 autofixables)
4. Considerar upgrade a TanStack Query para reemplazar hooks custom
