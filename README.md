# ScoreHub 🤖⚽

**Bot Telegram + Dashboard Web + ETL multi-competencia sobre Supabase**

---

## ¿Qué es ScoreHub?

Ecosistema inteligente de fútbol y apuestas que combina un **bot de Telegram** en producción con un **Dashboard Web** premium. Soporta múltiples competiciones (Mundial, ligas, copas) mediante una arquitectura ETL que sincroniza datos de 365scores a Supabase PostgreSQL.

### Características Principales

**🤖 Bot de Telegram (producción)**

- Resultados en vivo, estadísticas, tablas de posiciones
- Seguimiento de apuestas con notificaciones en tiempo real
- Lenguaje natural en español (Gemini) + comandos `/`
- Historial cara a cara, goleadores, rachas, tendencias

**🌐 Dashboard Web Premium**

- Centro de comando visual para el Mundial 2026
- Partidos en vivo con marcador animado estilo broadcast
- Tabla de posiciones, estadísticas, goleadores, noticias
- Historial de todas las ediciones del Mundial (1930-2022)
- Tendencias de apuestas, tips, predicciones
- Perfiles de jugadores y equipos con datos de carrera

**🎰 Seguimiento de Apuestas**

- Envía una captura de pantalla de tu apuesta y el bot la procesa automáticamente
- Utiliza OCR para extraer datos de imágenes de Bet365, Betway, y otras casas de apuestas
- Normaliza mercados: Over/Under, Corners, Tarjetas, Resultado Final, Ambos Marcan, Handicaps
- Monitoreo en tiempo real cada 60 segundos
- Notificaciones automáticas cuando se cumplen o fallan tus selecciones

**🇺🇸 Banderas de Países**

- El bot muestra automáticamente la bandera del país junto al nombre de cada equipo
- Notificaciones más visuales y fáciles de identificar

---

## ¿Cómo Funciona?

### 1. Registro Rápido

Cuando envías tu primer mensaje, el bot te pide crear un alias personalizado:

```
¡Hola! 👋 Soy ScoreHub, tu asistente de fútbol.
¿Cómo quieres que te llame? Escribe tu alias:
```

### 2. Consulta Resultados

Pregunta por el resultado de cualquier partido:

```
📩 "¿Cómo quedó Brasil?"
📩 "México vs Argentina"
```

### 3. Analiza Partidos

Obtén análisis detallados de enfrentamientos:

```
📩 "Analiza Brasil vs Francia"
📩 "Estadísticas de España"
```

### 4. Sigue Equipos

Recibe actualizaciones de tus equipos favoritos:

```
📩 "Seguir Brasil"
📩 "Mis equipos"
```

### 5. Apuestas con Imágenes 📸

Esta es la función más poderosa. Envía una captura de pantalla de tu apuesta y el bot:

1. **Analiza la imagen** usando OCR (reconocimiento óptico de caracteres)
2. **Extrae los datos** del partido y las selecciones
3. **Busca el partido** en la API de fútbol para verificar
4. **Guarda la apuesta** en la base de datos
5. **Monitorea en tiempo real** cada 60 segundos
6. **Notifica** cuando se cumplen o fallan las selecciones

---

## Tipos de Mercados Soportados

El normalizador reconoce automáticamente estos tipos de apuestas:

| Tipo                | Ejemplos                                           |
| ------------------- | -------------------------------------------------- |
| **Goles**           | Over 2.5, Under 3, Más de 2, Menos de 3.5          |
| **Corners**         | Over 5 corners, Under 10 corners, Más de 7 córners |
| **Tarjetas**        | Over 3.5 tarjetas, Under 5 cards                   |
| **Ambos Marcan**    | Both Teams To Score (BTTS), Ambos marcan           |
| **Resultado Final** | Gana Brasil, Local, Visitante, Empate              |
| **Handicaps**       | Handicap -1, Handicap +2                           |
| **Tiros**           | Shots on target Over/Under                         |
| **Posesión**        | Over 55% posesión                                  |

---

## Notificaciones Personalizadas

El bot tiene personalidad propia y envía notificaciones entusiastas:

**🎉 ¡Selección Cumplida!**

```
📐 ¡¡¡ Increíble! 🔥 !!!

📋 Tu selección: Over 5 corners
📏 Línea: 5

✅ ¡CUMPLIDA!
```

**⚽ ¡GOOOL!**

```
⚽ ¡¡¡ GOOOOOOOL de 🇧🇷 Brasil !!!

⏱️ Minuto 45'
📊 Marcador: 2 - 1

🔥 ¡¡El partido está que arde!!
```

**❌ Selección Fallida**

```
📋 No fue esta vez...

📋 Tu selección: Over 2.5
📏 Línea: 2.5

❌ Fallida - ¡Pero viene la próxima! 💪
```

---

## Arquitectura del Proyecto

```
┌──────────────────────────────────────────────────────────────────┐
│                        Telegram (producción)                       │
│                    @botmundialistabot (polling)                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      messageHandler.js                            │
│                 Router + Gemini (intent parser)                   │
└──┬───────────────┬───────────────┬───────────────┬──────────────┘
   │               │               │               │
   ▼               ▼               ▼               ▼
┌────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐
│ match  │  │  table   │  │   follow   │  │   betImage       │
│Handler │  │ Handler  │  │   Handler  │  │   Handler (OCR)   │
└───┬────┘  └────┬─────┘  └─────┬──────┘  └────────┬─────────┘
    │            │               │                   │
    ▼            ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                          │
│   competitions · games · standings · stats · history          │
│   news · trends · odds · brackets · predictions              │
│   competitors · athletes · venues · tickets · users          │
└──────────────────────────┬──────────────────────────────────┘
                           │ ▲
              ┌────────────┴─┴────────────┐
              ▼                           ▼
     ┌──────────────────┐      ┌──────────────────┐
     │  syncService.js   │      │  Dashboard Web   │
     │  ETL cron (PM2)   │      │  Express API     │
     │  15s · 1m · 10m   │      │  (reads from DB)  │
     │  1h · 6h · 24h   │      └──────────────────┘
     └───────┬───────────┘
             │
             ▼
     ┌──────────────────┐
     │  365scores API   │
     │  web (público)   │
     └──────────────────┘
```

---

## Estructura de Archivos

```
ScoreHub/
├── telegramBot.js              # Bot principal Telegram (long-polling)
├── bot.js                      # Entry point PM2
├── sync.js                     # ETL sync service (365scores → Supabase)
├── package.json
├── .env / .env.example
│
├── dashboard/                  # Dashboard Web
│   ├── server/                 # Express API (19 controllers)
│   │   └── controllers/       # Info, matches, standings, stats, news...
│   └── admin/                  # Panel admin (HTML plano)
│
├── database/
│   ├── connection.js           # Conexión Supabase PostgreSQL
│   └── migrations/             # Migraciones SQL
│       └── 004_scores365_data.sql  # 19 tablas de datos 365scores
├── handlers/
│   ├── messageHandler.js       # Router principal de mensajes
│   ├── matchHandler.js         # Resultados y partidos
│   ├── teamHandler.js          # Info y seguimiento de equipos
│   ├── statsHandler.js         # Estadísticas
│   ├── bettingHandler.js        # Análisis de apuestas
│   ├── tableHandler.js         # Tablas de posiciones
│   ├── mundialista365Handler.js # Tips, tendencias, cuotas, odds
│   ├── mundialistaStatsHandler.js # Noticias, brackets, goleadores
│   ├── followHandler.js        # /follow, /unfollow
│   ├── queryParser.js          # NLP para detectar intents
│   └── betImageHandler.js      # Procesamiento de imágenes OCR
├── services/
│   ├── syncService.js          # ETL motor (12 funciones de sync)
│   ├── scores365Service.js      # Cliente 365scores (gzip, retry)
│   ├── liveGamesPoller.js       # Polling live (25s cron)
│   ├── matchSearch.js          # Búsqueda de partidos en DB
│   ├── mundialCache.js         # Cache con TTL sobre Supabase
│   ├── teamAliases.js          # Loader dinámico de equipos (DB + hardcode)
│   ├── competitionName.js      # Nombre/alias de competencia desde DB
│   ├── geminiService.js         # Wrapper Gemini
│   ├── betEvaluator.js          # Evalúa 9 tipos de apuesta
│   ├── intentParser.js          # Regex + Gemini fallback
│   ├── images.js                # URLs de imágenes de atletas/equipos
│   ├── formatters.js            # Formateadores de respuesta
│   └── constants.js             # Constantes y mappings
├── utils/
│   ├── teamContext.js          # Flags, confederaciones
│   └── formatters.js           # Formateadores tabla, match line
└── scripts/
    └── test-365-mundial.js     # Test E2E de datos ingestados
```

---

## Tecnologías Utilizadas

| Categoría            | Tecnología                          | Propósito                              |
| -------------------- | ----------------------------------- | -------------------------------------- |
| **Bot Telegram**     | node-telegram-bot-api               | Bot en producción                      |
| **Dashboard Front**  | React 19 + TypeScript + Vite 6     | UI del dashboard                       |
| **Dashboard Back**   | Express.js                          | API REST 19 controllers                |
| **Base de Datos**    | Supabase PostgreSQL                 | Persistencia principal                 |
| **ETL**             | syncService.js + PM2                | Sincronización 365scores → Supabase    |
| **API Fútbol**       | 365scores web API (pública)         | Datos en tiempo real                   |
| **NLU**              | Gemini 2.5 Flash                   | Parseo de lenguaje natural             |
| **OCR**              | Tesseract.js                       | Reconocimiento de texto en imágenes   |
| **Scheduling**       | node-cron + PM2 + systemd          | Tareas programadas + auto-arranque    |

---

## Requisitos Previos

- **Node.js** 18+ instalado
- **Supabase** cuenta (o PostgreSQL local)
- **npm/pnpm** como gestor de paquetes

---

## Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/Pochonski/ScoreHub.git
cd ScoreHub
```

2. **Instalar dependencias del bot**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Configurar base de datos**

```bash
# Ejecutar schema en Supabase o PostgreSQL
psql -h your-host -U postgres -d your-db -f database/schema.sql
```

5. **Iniciar el bot de Telegram**

```bash
npm run start:telegram
```

6. **Iniciar el Dashboard Web** (opcional, en otra terminal)

```bash
cd dashboard
npm install
npm run dev
# Servidor Express: node server/index.js
```

7. **Iniciar panel admin** (opcional)

```bash
node admin/server.js
```

---

## Variables de Entorno

```env
# Base de Datos (Supabase)
SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# 365scores
PRIMARY_COMPETITION_ID=5930
PRIMARY_SEASON=25
SCORES365_APP_TYPE=5
SCORES365_POLL_MS=25000
SCORES365_MIN_INTERVAL_MS=120

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Telegram
TELEGRAM_TOKEN=your-bot-token

# Dashboard
ADMIN_PORT=3001
DASHBOARD_PORT=3000
```

---

## Panel Administrativo

El bot incluye un panel web para administrators en `http://localhost:3001`:

- 📊 Estadísticas generales (usuarios, consultas, equipos seguidos)
- 👥 Lista de usuarios registrados
- 📝 Historial de consultas
- 🏆 Equipos más seguidos
- 📈 Consultas por tipo de intent

---

## Workflow de una Apuesta

```
1. Usuario envía captura de pantalla por WhatsApp

2. messageHandler detecta que es una imagen
   └── betImageHandler.procesarImagenApuesta()

3. OCR extrae texto con Tesseract.js
   └── ocrService.procesarImagen()

4. Parser normaliza los datos
   └── betParserService.parseBetText()
   └── marketNormalizer.normalizarMercado()

5. Se busca el partido en la API
   └── footballApi.buscarPartidoReal()

6. Se guarda en base de datos
   └── INSERT apuestas, apuesta_selecciones

7. Si el partido existe, se inicia monitoreo
   └── betTrackingEngine.iniciar(60)

8. Cada 60 segundos se evalúan las selecciones
   └── betTrackingEngine.cicloEvaluacion()
   └── evaluarSeleccion() para cada apuesta

9. Cuando cambia el estado, se notifica
   └── notificationService.notificarSeleccionCumplida()
   └── notificationService.notificarSeleccionFallida()

10. Al terminar el partido, todo se cierra
    └── cerrarApuesta()
```

---

## Consideraciones Importantes

### ⚠️ Limitaciones del OCR

- El reconocimiento de texto **no es 100% preciso**
- Imágenes borrosas o con poco contraste reducen la calidad
- Bet365 y otras casas pueden tener CAPTCHA que bloquean automatización
- La confianza OCR se guarda para mostrar al usuario

### ⚠️ Rate Limits

- **RapidAPI**: 100 requests/día en el plan gratuito de SportAPI7
- El cacheo inteligente minimiza llamadas a la API
- El modo demo funciona sin API externa

### ⚠️ Privacidad

- Los mensajes de usuarios **no se almacenan** (solo el alias y consultas)
- Los IDs de WhatsApp se ocultan en logs de producción
- El modo demo funciona completamente sin base de datos

---

## Comandos Disponibles

| Comando                    | Descripción                    |
| -------------------------- | ------------------------------ |
| `ayuda`                    | Muestra todos los comandos     |
| `¿Cómo quedó [equipo]?`    | Resultado del último partido   |
| `[equipo] vs [equipo]`     | Resultado de enfrentamiento    |
| `Analiza [eq1] vs [eq2]`   | Análisis detallado del partido |
| `Dame info de [equipo]`    | Información del equipo         |
| `Estadísticas de [equipo]` | Estadísticas completas         |
| `Seguir [equipo]`          | Agregar a favoritos            |
| `Mis equipos`              | Ver equipos seguidos           |
| `Tabla del Mundial`        | Clasificación del Mundial      |
| `Tabla de [liga]`          | Tabla de cualquier liga        |

---

## License

Este proyecto es para uso personal y educativo.

---

## Créditos

Desarrollado con 🤖 Claude (Anthropic) + ❤️ para el fútbol

---

**¿Preguntas o problemas?** Abre un issue en el repositorio.
 
  
 