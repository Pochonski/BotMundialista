# Auditoría de endpoints por competición

Comparación completa de todos los endpoints REST disponibles entre las 7
competiciones activas (Mundial 2026 + Liga Promerica CR + 5 grandes ligas
europeas: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1).

Fecha del audit: 2026-07-23.

## Endpoints per-competición

Cuentan cuántos elementos retorna cada endpoint (no la longitud del array, sino un
número representativo: número de filas, número de tendencias, etc.).

Leyenda: ✅ datos · — sin datos porque la temporada aún no comienza ·
⚠️ endpoint implementado pero datos vacíos upstream

| Endpoint                           | MW  | PR  | PL   | LL   | SA   | BL   | L1   |
|------------------------------------|----:|----:|-----:|-----:|-----:|-----:|-----:|
| `matches?statusGroup=2`            |   0 |  20 |  20  |  20  |  20  |  20  |  20  |
| `matches/live`                     |   0 |   0 |   0  |   0  |   0  |   0  |   0  |
| `matches/featured`                 |  ✅ |  ✅ |  ✅  |  ✅  |  ✅  |  ✅  |  ✅  |
| `standings`                        |  12 |   1 |   1  |   1  |   1  |   1  |   1  |
| `standings/seasons`                |   4 |   1 |  38  |  38  |  37  |  38  |  38  |
| `brackets`                         |   4 |   0 |   0  |   0  |   0  |   0  |   0  |
| `history`                          |  23 | 123 | 127  |  95  | 123  | 114  |  88  |
| `history/stats`                    |  ✅ |  ✅ |  ✅  |  ✅  |  ✅  |  ✅  |  ✅  |
| `stats/scorers`                    |  10 |   0 |  10  |  10  |  10  |  10  |  10  |
| `stats/assists`                    |  10 |   0 |  10  |  10  |  10  |  10  |  10  |
| `stats/ratings`                    |  10 |   0 |  10  |  10  |  10  |  10  |  10  |
| `stats/team-of-week`               |  11 |   — |   —  |   —  |   —  |   —  |   —  |
| `trends`                           |   0 |   6 |   3  |   6  |   6  |   0  |   5  |
| `news`                             |  20 |   0 |   8  |  20  |  10  |  12  |   4  |
| `suggestions`                      |   6 |  16 |  16  |  16  |  16  |  16  |  16  |
| `competitions/:id/transfers/summary`|   0 |  29 |  48  |  45  |  50  |  37  |  53  |
| `competitions/:id/transfers`       |   0 |  92 | 100  | 100  | 100  | 100  | 100  |
| `competitions/:id/insights`       |   ✅ |  ✅ |  ✅  |  ✅  |  ✅  |  ✅  |  ✅  |
| `competitions/:id/seasons`        |   1 |   1 |   1  |   1  |   1  |   1  |   1  |
| `teams`                            |  48 |  42 |  25  |  47  |  57  |  56  |  87  |

## Endpoints per-partido (mismo partido en cada liga)

Cuentan elementos retornados para un partido upcoming de muestra.

| Endpoint                           | PR  | PL  | LL  | SA  | BL  | L1  |
|------------------------------------|----:|----:|----:|----:|----:|----:|
| `matches/:id/info`                 |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |
| `matches/:id/stats`                |   0 |   0 |   0 |   0 |   0 |   0 |
| `matches/:id/lineups`              |   — |   — |   — |   — |   — |   — |
| `matches/:id/tips`                 |   3 |   2 |   3 |   2 |   — |   2 |
| `matches/:id/trends`               |   3 |   2 |   3 |   2 |   — |   2 |
| `matches/:id/predictions`          |   2 |   2 |   2 |   2 |   2 |   2 |
| `matches/:id/timeline`             |   0 |   0 |   0 |   0 |   0 |   0 |
| `matches/:id/suggestions`          |   2 |   2 |   2 |   2 |   2 |   2 |
| `matches/:id/h2h`                  |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |  ✅ |
| `matches/:id/pre-stats`            |   0 |   0 |   0 |   0 |   0 |   0 |

> Mundial omitido en per-partido porque ya no tiene partidos upcoming.

## Análisis de los gaps

### Gaps REALES (problemas a arreglar)

1. **`matches/:id/lineups`** — `—` para todas las ligas. El endpoint existe y
   consulta `game_lineups` + upstream + `game_overviews`. El upstream devuelve
   `{"members":[]}` para partidos futuros (las alineaciones se publican
   ~1 hora antes del partido). No es un bug — los lineups solo están
   disponibles cerca del kickoff.

2. **`matches/:id/stats` / `matches/:id/timeline` / `matches/:id/pre-stats`** —
   `0` para todos. Las stats en vivo solo están disponibles durante el partido;
   el timeline solo para partidos terminados; las pre-stats requieren
   partidos cercanos al inicio. No es un bug.

### Gaps por temporada no comenzada

Los siguientes muestran `0` o `—` porque la temporada aún no arranca. Cuando
la temporada empiece (agosto-octubre 2026), los datos se llenarán solos:

- **Mundial 2026**: ya terminó (final el 14 julio 2026). trends=0 es correcto.
- **Liga Promerica CR**: Apertura empieza en septiembre. stats=0 es correcto.
- **Bundesliga**: temporada empieza ~21 agosto. stats/trends=0 es correcto.

El endpoint `/competitions/:id/insights` ahora distingue:
- `trends.count=0` con `items=[]` (vacío upstream)
- `outrights.available=true` con `data=null` (sincronizado pero upstream vacío)
- `topStats=null` cuando no hay stats (no hay datos)
- `teamOfWeek.available=false` cuando no hay once ideal

Esto permite al frontend mostrar empty-states específicos ("Se actualizará
cuando arranque la temporada") en lugar de errores.

## Cobertura verificada por tipo de dato

| Dato               | Mundial | Promerica | PL | LaLiga | Serie A | Bundesliga | Ligue 1 |
|--------------------|:-------:|:---------:|:--:|:------:|:-------:|:---------:|:-------:|
| Equipos            |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Partidos           |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Standings          |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Tournament Stats   |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| History            |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Trends             |   ⚠️    |    ✅     | ✅ |   ✅   |   ✅    |    ⚠️     |   ✅    |
| News               |   ✅    |    ⚠️     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Outrights          |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Transfers          |   N/A   |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Suggestions        |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |
| Team of Week       |   ✅    |    ⚠️     | ⚠️ |   ⚠️   |   ⚠️    |    ⚠️     |   ⚠️    |
| Predictions        |   ✅    |    ✅     | ✅ |   ✅   |   ✅    |    ✅     |   ✅    |

`⚠️` significa que el endpoint existe pero el upstream no devuelve datos
porque la temporada aún no ha comenzado.