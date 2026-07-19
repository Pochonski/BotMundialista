# Fase 1 — Fundación

## Objetivo

Establecer la base del proyecto: scaffold, design system, layout shell, y endpoints funcionales de la API.

## Entregables

### 1.1 Scaffold del proyecto

- [x] `npm create vite@latest dashboard -- --template react-ts`
- [x] Tailwind CSS 3 configurado con PostCSS
- [x] TypeScript configurado con paths absolutos (`@/` apuntando a `src/`)
- [x] Estructura de Clean Architecture creada (domain, data, presentation, infrastructure)

### 1.2 Design system implementado

- [x] CSS Custom Properties en `globals.css` con todos los tokens de color, tipografía, spacing
- [x] `tailwind.config.ts` extendido con colores, fuentes, y breakpoints personalizados
- [x] Google Fonts cargadas (Teko, Sora, JetBrains Mono)
- [x] Clases utilitarias base: `.bg-base`, `.bg-card`, `.text-muted`, etc.

### 1.3 Layout shell

- [x] `Navbar.tsx` — Barra superior con:
  - Logo "MUNDIALISTA 2026" a la izquierda
  - Navegación: En Vivo, Partidos, Tabla, Estadísticas, Noticias
  - Mobile: menú hamburguesa con overlay
- [x] `PageShell.tsx` — Layout principal:
  - Navbar fija al top
  - Contenedor responsive (max-width)
  - Footer minimalista
- [x] `DashboardPage.tsx` — Página principal con secciones placeholder

### 1.4 Express API (server/)

- [x] `server/index.js` — Express app con:
  - CORS habilitado
  - JSON body parser
  - Servir estáticos de `../dist` en producción
  - Health check endpoint
- [x] `server/routes/football.js` — Router con todos los endpoints
- [x] `server/controllers/footballController.js` — Controlador con:
  - Conexión a base de datos
  - Helper de CDN enrichment (usa `../../services/images.js`)
  - Fallback a 365scores live API cuando Cosmos está vacío
- [x] `server/package.json` — Dependencias: express, dotenv, cors, node-fetch

### 1.5 Endpoints implementados (Fase 1)

| Endpoint | Estado |
|----------|--------|
| `GET /api/football/health` | ✅ |
| `GET /api/football/matches` | ✅ Con filtros `?statusGroup=&stage=&teamId=` |
| `GET /api/football/matches/live` | ✅ |
| `GET /api/football/matches/featured` | ✅ Smart pick: live > próximo > último |
| `GET /api/football/matches/:id` | ✅ |
| `GET /api/football/matches/:id/stats` | ✅ Con fallback live |
| `GET /api/football/matches/:id/h2h` | ✅ |
| `GET /api/football/standings` | ✅ Con fallback live |
| `GET /api/football/news` | ✅ |
| `GET /api/football/teams` | ✅ |

### 1.6 Frontend consumiendo API

- [x] `infrastructure/config/index.ts` — API_BASE_URL
- [x] `infrastructure/http/HttpClient.ts` — fetch wrapper con tipado y errores
- [x] `data/datasources/ApiClient.ts` — Instancia de HttpClient configurada
- [x] Domain entities: Game, Team, Standing, News
- [x] Data mappers: GameMapper, StandingMapper, TeamMapper, NewsMapper
- [x] Data repositories: ApiGameRepository, ApiStandingRepository, ApiNewsRepository
- [x] Hooks: `useGames`, `useFeaturedGame`, `useStandings`, `useNews`
- [x] Skeleton loaders en `ui/Skeleton.tsx`

## Tareas detalladas

```
1.1 Crear proyecto Vite + React + TS
    → npm create vite@latest . -- --template react-ts
    → npm install tailwindcss @tailwindcss/vite
    → Configurar vite.config.ts con tailwind plugin
    → Configurar tsconfig con paths

1.2 Escribir globals.css
    → CSS Custom Properties (colores, tipografía, spacing)
    → Tailwind layers (@tailwind base/components/utilities)
    → Clases base

1.3 Componentes de layout
    → Navbar con navegación responsive
    → PageShell con estructura de grid
    → Footer

1.4 Servidor Express
    → npm init en server/
    → npm install express dotenv cors node-fetch
    → index.js con CORS + static serve
    → routes/football.js con router
    → controllers/footballController.js con lógica Cosmos

1.5 Capa de datos frontend
    → HttpClient con fetch wrapper
    → ApiClient configurada
    → Domain entities interfaces
    → Mappers
    → Repositorios
    → Hooks

1.6 DashboardPage con secciones
    → HeroMatch placeholder
    → MatchTicker con datos reales
    → MatchGrid con filtros
    → Standings
    → NewsFeed
```

## Criterios de aceptación

- [ ] `npm run dev` en dashboard/ levanta Vite y se ve el layout shell
- [ ] `node server/index.js` responde en `/api/football/health`
- [ ] La página carga partidos reales desde el API
- [ ] Responsive: se ve bien en mobile (375px) y desktop (1440px)
- [ ] Skeleton loaders visibles durante carga
- [ ] Keyboard focus visible en navegación
- [ ] Ficheros .gitignore correctos
