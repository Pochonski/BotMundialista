// BotMundialista - Telegram Bot (usando API directa)
require('dotenv').config();
const http = require('http');
const fetch = require('node-fetch');
const messageHandler = require('./handlers/messageHandler');
const followHandler = require('./handlers/followHandler');
const conversationalHandler = require('./handlers/conversationalHandler');
const mundialista365 = require('./handlers/mundialista365Handler');
const mundialistaStats = require('./handlers/mundialistaStatsHandler');
const cache = require('./services/mundialCache');
const { getAthletePhotoUrl, getCountryFlagUrl, getTeamBadgeUrl } = require('./services/images');
const { pool, testConnection } = require('./database/connection');
const userStorage = require('./utils/userStorage');
const telegramNotifier = require('./services/telegramNotifier');
const conversationContext = require('./services/conversationContext');

if (process.env.ENABLE_LIVE_NOTIFIER === 'true') {
  try {
    telegramNotifier.registerBot({ sendMessage }, 'telegram');
    telegramNotifier.attach();
  } catch (e) {
    console.error('[telegramBot] error attaching notifier:', e.message);
  }
}

// Token del bot de Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Offset para polling
let offset = 0;
let isRunning = false;

// Flag para saber si la DB está disponible
let dbAvailable = false;

// Mini servidor HTTP para health checks de Azure App Service
// Azure Linux requiere que el proceso escuche en PORT para considerarlo saludable
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/health' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      bot: 'BotMundialista',
      uptime: process.uptime(),
      db: dbAvailable ? 'connected' : 'demo',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Health server listening on port ${PORT}`);
});

/**
 * Hace una solicitud a la API de Telegram
 */
async function telegramRequest(method, params = {}) {
  const url = `${API_URL}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

/**
 * Envía un mensaje
 */
async function sendMessage(chatId, text, options = {}) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...options
  });
}

async function sendPhoto(chatId, photoUrl, caption = '', options = {}) {
  return telegramRequest('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'Markdown',
    ...options
  });
}

async function sendMediaGroup(chatId, media, options = {}) {
  return telegramRequest('sendMediaGroup', {
    chat_id: chatId,
    media,
    ...options
  });
}

/**
 * Maneja comandos de Telegram (que empiezan con /)
 */
async function handleCommand(chatId, text, userName, userId) {
  const cmd = text.toLowerCase();
  const storedAlias = userStorage.getAlias(userId);
  const alias = storedAlias || userName || 'Usuario';

  switch (cmd) {
    case '/start':
    case '/inicio':
      await sendMessage(chatId,
        `🏆 *BotMundialista* - Asistente del Mundial 2026\n\n` +
        `¡Hola ${alias}! 👋 Soy tu asistente de fútbol.\n\n` +
        `📱 *Comandos básicos:*\n` +
        `  /start · /help - Iniciar / ver ayuda\n` +
        `  /partidos - Partidos de hoy\n` +
        `  /manana - Partidos de mañana\n` +
        `  /tabla - Tabla del Mundial\n` +
        `  /grupo [A-L] - Tabla de grupo _(ej: /grupo A)_\n` +
        `  /resultado [equipo] - Resultado _(ej: /resultado brasil)_\n` +
        `  /analizar [eq1] vs [eq2] - Análisis _(ej: /analizar brasil vs argentina)_\n` +
        `  /info [equipo] · /seguir [equipo] - Info / seguir equipo\n` +
        `  /cambiarusuario [nombre] - Cambiar apodo\n\n` +
        `🎯 *Tips y tendencias (365scores):*\n` +
        `  /tip [eq1] vs [eq2] - Tip con confianza _(ej: /tip brasil vs argentina)_\n` +
        `  /tendencias - Top 10 tendencias del Mundial\n` +
        `  /tendencias [eq1] vs [eq2] - Trends de un partido _(ej: /tendencias brasil vs argentina)_\n` +
        `  /predicciones <gameId> - Predicciones de la comunidad\n\n` +
        `📡 *Stats en vivo (365scores):*\n` +
        `  /live - Partidos en vivo ahora\n` +
        `  /stats-vivo <gameId> - Stats del último snapshot\n` +
        `  /alineacion <gameId> - Titulares y formación\n` +
        `  /previa <gameId> - Pre-match stats\n` +
        `  /h2h <gameId> - Historial entre los equipos\n\n` +
        `📰 *Contenido del Mundial:*\n` +
        `  /noticias - Últimas noticias\n` +
        `  /noticias [equipo] - Noticias de un equipo _(ej: /noticias brasil)_\n` +
        `  /equipoideal - Team of the Week\n` +
        `  /bracket - Llaves eliminatorias\n` +
        `  /bracket grupos - Fase de grupos\n` +
        `  /historial - Campeones 1930-2022\n` +
        `  /historial 2022 - Final de ese año\n` +
        `  /historial brasil - Ediciones del equipo\n` +
        `  /goleadores - Top goleadores (con foto)\n` +
        `  /jugador <nombre> - Foto + info del jugador\n\n` +
        `💡 También podés escribir en lenguaje natural:\n` +
        `  "¿Cómo quedó Brasil?"\n` +
        `  "Tabla del grupo C"\n` +
        `  "Dame info de Alemania"`
      );
      return true;

    case '/help':
    case '/ayuda':
      await sendMessage(chatId,
        `📖 *COMANDOS - MUNDIAL 2026*\n\n` +
        `⚽ *Partidos:*\n` +
        `  /partidos - Partidos de hoy\n` +
        `  /manana - Partidos de mañana\n` +
        `  /resultado [equipo] - Último resultado _(ej: /resultado brasil)_\n` +
        `  /analizar [eq1] vs [eq2] - Análisis _(ej: /analizar brasil vs argentina)_\n` +
        `  /proximos [equipo] · /siguiente [equipo] - Próximos partidos\n\n` +
        `🏆 *Tablas:*\n` +
        `  /tabla - Tabla del Mundial\n` +
        `  /grupo [A-L] - Grupo específico _(ej: /grupo A)_\n\n` +
        `👥 *Equipos:*\n` +
        `  /info [equipo] - Info del equipo\n` +
        `  /seguir [equipo] - Seguir equipo\n` +
        `  /cambiarusuario [nombre] - Cambiar apodo\n` +
        `  /yo · /reset - Perfil / borrar datos\n\n` +
        `🎯 *Tips y tendencias:*\n` +
        `  /tip [eq1] vs [eq2] - Tip con % de confianza\n` +
        `  /tendencias - Top 10 Mundial\n` +
        `  /tendencias [eq1] vs [eq2] - Trends de un partido\n` +
        `  /predicciones <gameId> - Predicciones comunidad\n\n` +
        `📡 *Stats en vivo:*\n` +
        `  /live - En vivo ahora\n` +
        `  /stats-vivo <gameId> - Stats del último snapshot\n` +
        `  /alineacion <gameId> - Titulares y formación\n` +
        `  /previa <gameId> - Pre-match stats\n` +
        `  /h2h <gameId> - Historial entre los equipos\n\n` +
        `📰 *Contenido del Mundial:*\n` +
        `  /noticias - Últimas noticias del Mundial\n` +
        `  /noticias [equipo] - Noticias de un equipo\n` +
        `  /equipoideal - Team of the Week (formación, ratings)\n` +
        `  /bracket - Llaves eliminatorias\n` +
        `  /bracket grupos - Fase de grupos\n` +
        `  /historial - Todos los campeones\n` +
        `  /historial [año] - Final específica _(ej: /historial 2022)_\n` +
        `  /historial [equipo] - Ediciones del equipo _(ej: /historial brasil)_\n` +
        `  /goleadores - Ranking de goleadores\n\n` +
        `💡 _También entendés: "Cómo le fue a X", "Brasil vs Francia", "Estadísticas de X", "Tabla de la Premier"…_`
      );
      return true;

    case '/cambiarnombre':
    case '/cambiarnombre@botmundialistabot':
    case '/cambiarusuario':
    case '/cambiarusuario@botmundialistabot':
      const argNombre = command.replace(/^\/(cambiarnombre|cambiarusuario)(@\w+)?/i, '').trim();
      if (!argNombre) {
        await sendMessage(chatId,
          `✏️ *Cambiar nombre*\n\n` +
          `Uso: \`/cambiarusuario TuNombre\`\n\n` +
          `Tu apodo actual: *${alias}*\n` +
          `Máximo ${userStorage.MAX_LEN} caracteres.\n\n` +
          `Otros comandos: /mialias (ver) · /help (ayuda)`
        );
        return true;
      }
      const r = await userStorage.setAlias(userId, argNombre);
      if (!r.ok) {
        await sendMessage(chatId, `⚠️ No pude cambiar tu nombre: ${r.reason}`);
      } else {
        const syncMsg = r.synced
          ? '✅ Guardado en Supabase'
          : '💾 Guardado localmente (Supabase no disponible)';
        await sendMessage(chatId,
          `✅ *Listo*\n\n` +
          `Tu nuevo apodo es: *${r.alias}*\n` +
          `${syncMsg}\n\n` +
          `A partir de ahora te saludaré como "${r.alias}".`
        );
      }
      return true;

    case '/mialias':
      const currentAlias = userStorage.getAlias(userId);
      if (currentAlias) {
        await sendMessage(chatId,
          `👤 *Tu apodo actual*\n\n` +
          `Apodo: *${currentAlias}*\n` +
          `ID de Telegram: \`${userId}\`\n\n` +
          `Para cambiarlo: \`/cambiarnombre NuevoNombre\``
        );
      } else {
        await sendMessage(chatId,
          `👤 Aún no tienes apodo personalizado.\n\n` +
          `Tu nombre actual es: *${userName || 'Usuario'}* (de Telegram)\n\n` +
          `Para crear uno: \`/cambiarnombre TuNombre\``
        );
      }
      return true;

    case '/partidos':
    case '/hoy':
      // Crear objeto para messageHandler
      const msgPartidos = {
        from: chatId.toString(),
        body: 'partidos de hoy',
        hasMedia: false,
        reply: async (text) => await sendMessage(chatId, text)
      };
      await messageHandler(null, msgPartidos);
      return true;

    case '/manana':
    case '/mañana':
    case '/tomorrow': {
      const hoyCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
      const [y, m, d] = hoyCR.split('-').map(Number);
      const tomorrow = new Date(y, m - 1, d + 1).toISOString().split('T')[0].replace(/-/g, '');
      try {
        const matches = await cache.getWorldCupGames({ date: tomorrow });
        if (!matches || matches.length === 0) {
          await sendMessage(chatId,
            `📅 *MUNDIAL — MAÑANA*\n\n🟢 No hay partidos del Mundial programados para mañana.`);
          return true;
        }
        const porGrupo = {};
        mundialMatches.forEach(m => {
          const letra = (m.stageName || '').match(/Group\s+([A-L])/i)?.[1]?.toUpperCase() || '?';
          if (!porGrupo[letra]) porGrupo[letra] = [];
          porGrupo[letra].push(m);
        });
        let msg = `📅 *MUNDIAL — MAÑANA*\n\n`;
        Object.keys(porGrupo).sort().forEach(g => {
          msg += `📋 *GRUPO ${g}*\n`;
          porGrupo[g].forEach(m => {
            msg += `⚽ ${m.homeTeam} vs ${m.awayTeam}`;
            if (m.time) msg += `  _(${m.time})_`;
            msg += '\n';
          });
          msg += '\n';
        });
        await sendMessage(chatId, msg.trim());
      } catch (e) {
        await sendMessage(chatId, '⚠️ No pude obtener partidos de mañana.');
      }
      return true;
    }

    case '/tabla':
    case '/clasificacion':
      const msgTabla = {
        from: chatId.toString(),
        body: 'tabla del mundial',
        hasMedia: false,
        reply: async (text) => await sendMessage(chatId, text)
      };
      await messageHandler(null, msgTabla);
      return true;

    case '/mundial': {
      await sendMessage(chatId,
        `🏆 *MUNDIAL 2026*\n\n` +
        `🌎 *Sede:* EE.UU. · Canadá · México\n` +
        `📅 *Fechas:* 11 junio – 19 julio 2026\n` +
        `👥 *Equipos:* 48 selecciones\n` +
        `🗂 *Grupos:* 12 (A a L)\n` +
        `⚽ *Partidos:* 104 (64 fase grupos + 32 eliminación + 8 clasificación)\n` +
        `🥇 *Final:* 19 jul 2026 — MetLife Stadium, NJ\n\n` +
        `📋 *Comandos relacionados:*\n` +
        `• /grupo [A-L] — Tabla de un grupo\n` +
        `• /partidos — Partidos de hoy\n` +
        `• /manana — Partidos de mañana\n` +
        `• /goleadores — Top goleadores del Mundial`
      );
      return true;
    }

    case '/yo':
    case '/perfil':
    case '/profile':
      try {
        const alias = userStorage.getAlias(userId);
        let followedCount = 0;
        let queryCount = 0;
        try {
          const f = await pool.query(
            `SELECT COUNT(*) FROM equipos_seguidos WHERE id_usuario = $1`,
            [userId]
          );
          followedCount = parseInt(f.rows[0]?.count || 0, 10);
          const h = await pool.query(
            `SELECT COUNT(*) FROM historial_consultas WHERE id_usuario = $1`,
            [userId]
          );
          queryCount = parseInt(h.rows[0]?.count || 0, 10);
        } catch (e) { /* DB opcional */ }
        await sendMessage(chatId,
          `👤 *TU PERFIL*\n\n` +
          `🏷  *Apodo:* ${alias || userName || 'Sin definir'}\n` +
          `🆔 *ID:* \`${userId}\`\n` +
          `⭐ *Equipos seguidos:* ${followedCount}\n` +
          `💬 *Consultas realizadas:* ${queryCount}\n\n` +
          `📋 *Comandos útiles:*\n` +
          `• /misfavoritos — Ver equipos seguidos\n` +
          `• /cambiarusuario [nombre] — Cambiar apodo\n` +
          `• /reset — Borrar todos mis datos`
        );
      } catch (e) {
        await sendMessage(chatId, '⚠️ No pude cargar tu perfil.');
      }
      return true;

    case '/reset': {
      await sendMessage(chatId,
        `⚠️ *Borrar todos mis datos*\n\n` +
        `Esto eliminará:\n` +
        `• Tu apodo personalizado\n` +
        `• Todos los equipos que sigues\n` +
        `• Tu historial de consultas\n\n` +
        `Para confirmar, escribí: *BORRAR TODO*\n` +
        `Para cancelar, enviá cualquier otro mensaje.`);
      userStorage.markPendingReset(userId);
      return true;
    }

    default:
      // Comandos con argumentos: /resultado, /analizar, /info, /seguir
      if (cmd.startsWith('/resultado ')) {
        const equipoText = text.replace('/resultado ', '').replace('/Resultado ', '');
        const vsMatch = equipoText.match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
        let photoUrls = null;
        if (vsMatch) {
          const [_, homeName, awayName] = vsMatch;
          const [homeTeam, awayTeam] = await Promise.all([
            cache.getTeamByName(homeName.trim()),
            cache.getTeamByName(awayName.trim())
          ]);
          const homeBadge = homeTeam?.id ? getTeamBadgeUrl(homeTeam.id, homeTeam.imageVersion) : null;
          const awayBadge = awayTeam?.id ? getTeamBadgeUrl(awayTeam.id, awayTeam.imageVersion) : null;
          if (homeBadge && awayBadge) photoUrls = [homeBadge, awayBadge];
          else if (homeBadge) photoUrls = [homeBadge];
          else if (awayBadge) photoUrls = [awayBadge];
        } else {
          const team = await cache.getTeamByName(equipoText.trim());
          if (team?.id) photoUrls = [getTeamBadgeUrl(team.id, team.imageVersion)];
        }
        const msgRes = {
          from: chatId.toString(),
          body: `como quedo ${equipoText}`,
          hasMedia: false,
          reply: async (t) => {
            if (photoUrls && photoUrls.length === 2) {
              await sendMediaGroup(chatId, photoUrls.map(u => ({ type: 'photo', media: u })));
              await sendMessage(chatId, t);
            } else if (photoUrls && photoUrls.length === 1) {
              await sendPhoto(chatId, photoUrls[0], t);
            } else {
              await sendMessage(chatId, t);
            }
          }
        };
        await messageHandler(null, msgRes);
        return true;
      }

      if (cmd === '/analizar' || cmd === '/analizar@botmundialistabot') {
        await sendMessage(chatId,
          `📊 *Analizar partido*\n\n` +
          `Uso: \`/analizar [equipo1] vs [equipo2]\`\n\n` +
          `Ejemplos:\n` +
          `• /analizar Brasil vs Francia\n` +
          `• /analizar Argentina vs Alemania\n\n` +
          `Genero estadísticas, forma reciente y pronóstico.`
        );
        return true;
      }

      if (cmd.startsWith('/analizar ')) {
        const vsText = text.replace('/analizar ', '').replace('/Analizar ', '');
        const msgAna = {
          from: chatId.toString(),
          body: `analiza ${vsText}`,
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgAna);
        return true;
      }

      // Aliases de stats: /goles, /corners, /posesion, /tarjetas
      const statAliases = [
        { cmd: '/goles', tipo: 'goles' },
        { cmd: '/corners', tipo: 'córners' },
        { cmd: '/posesion', tipo: 'posesión' },
        { cmd: '/posesión', tipo: 'posesión' },
        { cmd: '/tarjetas', tipo: 'tarjetas' },
        { cmd: '/goleador', tipo: 'goles' },
      ];
      for (const alias of statAliases) {
        if (cmd === alias.cmd || cmd === alias.cmd + '@botmundialistabot') {
          await sendMessage(chatId,
            `📊 *${alias.cmd.replace('/', '').toUpperCase()} [equipo]*\n\n` +
            `Uso: \`${alias.cmd} [equipo]\`\n\n` +
            `Ejemplos:\n` +
            `• ${alias.cmd} Brasil\n` +
            `• ${alias.cmd} Argentina\n\n` +
            `Te muestro ${alias.tipo} de los últimos partidos.`
          );
          return true;
        }
        if (cmd.startsWith(alias.cmd + ' ')) {
          const equipo = text.replace(new RegExp(`^${alias.cmd}(?:@\\w+)? `, 'i'), '').trim();
          const msgStat = {
            from: chatId.toString(),
            body: `${alias.tipo} de ${equipo}`,
            hasMedia: false,
            reply: async (t) => await sendMessage(chatId, t)
          };
          await messageHandler(null, msgStat);
          return true;
        }
      }

      // /racha [equipo] → muestra racha W/L y forma
      if (cmd === '/racha' || cmd === '/racha@botmundialistabot') {
        await sendMessage(chatId,
          `🔥 *RACHA [equipo]*\n\n` +
          `Uso: \`/racha [equipo]\`\n\n` +
          `Ejemplos:\n` +
          `• /racha Brasil\n` +
          `• /racha Argentina\n\n` +
          `Te muestro la racha actual (W = victorias, L = derrotas).`
        );
        return true;
      }
      if (cmd.startsWith('/racha ')) {
        const equipo = text.replace(/^\/racha(?:@\w+)? /i, '').trim();
        const team = await cache.getTeamByName(equipo);
        const photoUrl = team?.id ? getTeamBadgeUrl(team.id, team.imageVersion) : null;
        const msgSt = {
          from: chatId.toString(),
          body: `cual es la racha de ${equipo}`,
          hasMedia: false,
          reply: async (t) => {
            if (photoUrl) {
              await sendPhoto(chatId, photoUrl, t);
            } else {
              await sendMessage(chatId, t);
            }
          }
        };
        await messageHandler(null, msgSt);
        return true;
      }

      // /proximos [equipo] y /siguiente [equipo]
      if (cmd === '/proximos' || cmd === '/siguiente' ||
          cmd === '/proximos@botmundialistabot' || cmd === '/siguiente@botmundialistabot') {
        await sendMessage(chatId,
          `📅 *${cmd.startsWith('/siguiente') ? 'SIGUIENTE' : 'PRÓXIMOS'} [equipo]*\n\n` +
          `Uso: \`${cmd} [equipo]\`\n\n` +
          `• /proximos Brasil — Próximos 5 partidos\n` +
          `• /siguiente Argentina — Solo el siguiente partido`
        );
        return true;
      }
      if (cmd.startsWith('/proximos ') || cmd.startsWith('/siguiente ')) {
        const limit = cmd.startsWith('/siguiente') ? 1 : 5;
        const equipo = text.replace(/^\/(proximos|siguiente)(?:@\w+)? /i, '').trim();
        try {
          const team = await cache.getTeamByName(equipo);
          if (!team) {
            await sendMessage(chatId, `⚠️ No encontré al equipo "${equipo}".`);
            return true;
          }
          const allMatches = await cache.getRecentWorldCupMatchesByTeam(team.id);
          const now = Date.now();
          const upcoming = allMatches
            .filter((m) => m.homeCompetitor?.score == null && new Date(m.startTime || m.date || 0).getTime() >= now - 86400000)
            .sort((a, b) => new Date(a.startTime || a.date) - new Date(b.startTime || b.date))
            .slice(0, limit);
          if (!upcoming || upcoming.length === 0) {
            await sendMessage(chatId, `📅 No hay partidos próximos para *${team.name}*.`);
            return true;
          }
          let msg = `📅 *${cmd.startsWith('/siguiente') ? 'PRÓXIMO' : 'PRÓXIMOS'} PARTIDO${limit > 1 ? 'S' : ''} - ${team.name.toUpperCase()}*\n\n`;
          upcoming.forEach(m => {
            const date = new Date(m.date).toLocaleDateString('es-ES', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            const tournament = m.leagueName || m.tournament || 'Competición';
            const isHome = m.homeTeamId == team.id;
            msg += `📅 ${date}\n`;
            msg += `  ${m.homeTeam} vs ${m.awayTeam}\n`;
            msg += `  ${isHome ? '🟢 LOCAL' : '✈️ VISITANTE'} · 🏆 ${tournament}\n\n`;
          });
          const badgeUrl = team?.id ? getTeamBadgeUrl(team.id, team.imageVersion) : null;
          if (badgeUrl) {
            await sendPhoto(chatId, badgeUrl, `🏆 ${team.name}`);
          }
          await sendMessage(chatId, msg.trim());
        } catch (e) {
          await sendMessage(chatId, '⚠️ No pude obtener próximos partidos.');
        }
        return true;
      }

      // /dejarseguir [equipo]
      if (cmd === '/dejarseguir' || cmd === '/dejarseguir@botmundialistabot') {
        await sendMessage(chatId,
          `🚫 *DEJAR DE SEGUIR [equipo]*\n\n` +
          `Uso: \`/dejarseguir [equipo]\`\n\n` +
          `• /dejarseguir Brasil\n` +
          `• /dejarseguir Argentina`
        );
        return true;
      }
      if (cmd.startsWith('/dejarseguir ') || cmd.startsWith('/dejar_seguir ')) {
        const equipo = text.replace(/^\/(dejarseguir|dejar_seguir)(?:@\w+)? /i, '').trim();
        const msgNoSeg = {
          from: chatId.toString(),
          body: `dejar de seguir ${equipo}`,
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgNoSeg);
        return true;
      }
      // Sin argumentos especiales: enviar el mensaje al messageHandler como texto
      if (/^\/dejarseguir(?:@\w+)?$/i.test(cmd)) {
        await sendMessage(chatId,
          `🚫 *DEJAR DE SEGUIR [equipo]*\n\nUso: \`/dejarseguir [equipo]\``
        );
        return true;
      }

      // /misfavoritos, /misequipos, /misfavorito
      if (cmd === '/misfavoritos' || cmd === '/misequipos' || cmd === '/misfavorito' ||
          cmd === '/misfavoritos@botmundialistabot') {
        const msgList = {
          from: chatId.toString(),
          body: 'mis equipos',
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgList);
        return true;
      }

      // /dondever [equipo]
      if (cmd === '/dondever' || cmd === '/dondever@botmundialistabot') {
        await sendMessage(chatId,
          `📺 *DÓNDE VER [equipo]*\n\n` +
          `Uso: \`/dondever [equipo]\`\n\n` +
          `Por ahora te muestro dónde se juega (estadio) el próximo partido.`
        );
        return true;
      }
      if (cmd.startsWith('/dondever ')) {
        const equipo = text.replace(/^\/dondever(?:@\w+)? /i, '').trim();
        try {
          const team = await cache.getTeamByName(equipo);
          if (!team) {
            await sendMessage(chatId, `⚠️ No encontré al equipo "${equipo}".`);
            return true;
          }
          const allMatches = await cache.getRecentWorldCupMatchesByTeam(team.id);
          const now = Date.now();
          const upcoming = allMatches
            .filter((m) => m.homeCompetitor?.score == null && new Date(m.startTime || m.date || 0).getTime() >= now - 86400000)
            .sort((a, b) => new Date(a.startTime || a.date) - new Date(b.startTime || b.date))
            .slice(0, 1);
          if (!upcoming || upcoming.length === 0) {
            await sendMessage(chatId, `📺 No hay partidos próximos de *${team.name}* para mostrar sede.`);
            return true;
          }
          const m = upcoming[0];
          await sendMessage(chatId,
            `📺 *PRÓXIMO PARTIDO - ${team.name.toUpperCase()}*\n\n` +
            `${m.homeTeam} vs ${m.awayTeam}\n` +
            `📅 ${new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n` +
            `🏆 ${m.leagueName || m.tournament || 'Competición'}\n\n` +
            `ℹ️ Los derechos de transmisión varían por país. Te sugiero consultar la guía de TV de tu país (ej: "TyC Sports" o "ESPN" en Argentina, "TUDN" en México, "Movistar+" en España).`
          );
        } catch (e) {
          await sendMessage(chatId, '⚠️ No pude obtener info.');
        }
        return true;
      }

      if (cmd.startsWith('/info ')) {
        const equipo = text.replace(/^\/info(?:@\w+)? /i, '').trim();
        const team = await cache.getTeamByName(equipo);
        let photoUrl = null;
        if (team && team.id) {
          photoUrl = getTeamBadgeUrl(team.id, team.imageVersion) || getCountryFlagUrl(team.countryId);
        } else if (team && team.countryId) {
          photoUrl = getCountryFlagUrl(team.countryId);
        }
        const msgInfo = {
          from: chatId.toString(),
          body: `dame info de ${equipo}`,
          hasMedia: false,
          reply: async (t) => {
            if (photoUrl) {
              await sendPhoto(chatId, photoUrl, t);
            } else {
              await sendMessage(chatId, t);
            }
          }
        };
        await messageHandler(null, msgInfo);
        return true;
      }

      if (cmd.startsWith('/seguir ')) {
        const equipo = text.replace('/seguir ', '').replace('/Seguir ', '');
        const msgSeg = {
          from: chatId.toString(),
          body: `seguir ${equipo}`,
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgSeg);
        return true;
      }

      if (cmd.startsWith('/grupo ')) {
        const grupo = text.replace('/grupo ', '').replace('/Grupo ', '').toUpperCase();
        const msgGrupo = {
          from: chatId.toString(),
          body: `tabla grupo ${grupo}`,
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgGrupo);
        try {
          const standings = await cache.getWorldCupStandings();
          const standing = standings.find(s => {
            const letra = s.name?.match(/Group\s+([A-L])/i)?.[1]?.toUpperCase();
            return letra === grupo;
          });
          if (standing?.teams?.length > 0) {
            const media = [];
            for (const t of standing.teams) {
              const team = await cache.getTeamByName(t.name);
              if (team?.id) {
                const url = getTeamBadgeUrl(team.id, team.imageVersion);
                if (url) media.push({ type: 'photo', media: url });
              }
            }
            if (media.length > 0) await sendMediaGroup(chatId, media);
          }
        } catch (e) { /* ignore badge errors */ }
        return true;
      }

      // ===========================================================
      // FASE 2: Tips y Tendencias (365scores via Cosmos)
      // ===========================================================

      // /live — partidos en vivo ahora
      if (cmd === '/live' || cmd === '/live@botmundialistabot' || cmd === '/envivo' || cmd === '/envivo@botmundialistabot') {
        const text = await mundialista365.getLiveGames();
        await sendMessage(chatId, text);
        return true;
      }

      // /tip — puede ser con args (eq1 vs eq2) o sin args (prompt de uso)
      if (cmd === '/tip' || cmd === '/tip@botmundialistabot') {
        await sendMessage(chatId,
          `🎯 *TIP DE PARTIDO*\n\n` +
          `Uso: \`/tip [equipo1] vs [equipo2]\`\n\n` +
          `Ejemplos:\n` +
          `• /tip brasil vs argentina\n` +
          `• /tip francia vs alemania\n\n` +
          `💡 El tip se calcula con base en las tendencias de los partidos (365scores). ` +
          `Para más detalles: \`/tendencias brasil vs argentina\` o \`/stats-vivo <gameId>\` (si lo conocés).`
        );
        return true;
      }
      if (cmd.startsWith('/tip ')) {
        const args = text.replace(/^\/tip(?:@\w+)?\s+/i, '').trim();
        const m = args.match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
        if (!m) {
          await sendMessage(chatId,
            `⚠️ Formato: \`/tip [equipo1] vs [equipo2]\`\n\n` +
            `Ejemplo: \`/tip brasil vs argentina\``
          );
          return true;
        }
        const home = m[1].trim();
        const away = m[2].trim();
        const t = await mundialista365.getTipPartido(home, away);
        await sendMessage(chatId, t);
        return true;
      }

      // /tendencias — top Mundial o por equipos (eq1 vs eq2)
      if (cmd === '/tendencias' || cmd === '/tendencias@botmundialistabot' || cmd === '/trends' || cmd === '/trends@botmundialistabot') {
        const t = await mundialista365.getTendencias('competition', null, 10);
        await sendMessage(chatId, t);
        return true;
      }
      if (cmd.startsWith('/tendencias ') || cmd.startsWith('/trends ')) {
        const arg = text.replace(/^\/(tendencias|trends)(?:@\w+)?\s+/i, '').trim();
        if (!arg) {
          const t = await mundialista365.getTendencias('competition', null, 10);
          await sendMessage(chatId, t);
          return true;
        }
        // Modo: "eq1 vs eq2" → resuelve partido y devuelve sus trends
        const m = arg.match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
        if (m) {
          const t = await mundialista365.getTendenciasByTeams(m[1].trim(), m[2].trim(), 10);
          await sendMessage(chatId, t);
          return true;
        }
        // Fallback: usage
        await sendMessage(chatId,
          `📊 *TENDENCIAS*\n\n` +
          `Uso:\n` +
          `  \`/tendencias\` — Top Mundial\n` +
          `  \`/tendencias brasil vs argentina\` — Trends del partido\n\n` +
          `💡 Para stats en vivo de un partido, usá los nombres con /tip, /stats-vivo o /alineacion.`
        );
        return true;
      }

      // /predicciones <gameId>
      if (cmd === '/predicciones' || cmd === '/predicciones@botmundialistabot' || cmd === '/prediccion' || cmd === '/prediccion@botmundialistabot') {
        await sendMessage(chatId,
          `🗳️ *PREDICCIONES DE LA COMUNIDAD*\n\n` +
          `Uso: \`/predicciones <gameId>\`\n\n` +
          `Ejemplo: \`/predicciones 4749268\`\n\n` +
          `💡 Para buscar el gameId, usá \`/tip brasil vs argentina\` o \`/live\`.`
        );
        return true;
      }
      if (cmd.startsWith('/predicciones ') || cmd.startsWith('/prediccion ')) {
        const arg = text.replace(/^\/(predicciones|prediccion)(?:@\w+)?\s+/i, '').trim();
        const t = await mundialista365.getPredicciones(arg);
        await sendMessage(chatId, t);
        return true;
      }

      // ===========================================================
      // FASE 4: Stats en vivo y alineaciones (365scores via Cosmos)
      // ===========================================================

      // /stats-vivo <gameId> — último snapshot de game_snapshots
      if (cmd === '/stats-vivo' || cmd === '/stats-vivo@botmundialistabot' ||
          cmd === '/statsvivo' || cmd === '/statsvivo@botmundialistabot' ||
          cmd === '/live-stats' || cmd === '/live-stats@botmundialistabot') {
        await sendMessage(chatId,
          `📊 *STATS EN VIVO*\n\n` +
          `Uso: \`/stats-vivo <gameId>\`\n\n` +
          `Ejemplo: \`/stats-vivo 4749268\`\n\n` +
          `💡 Para encontrar el gameId:\n` +
          `• \`/live\` para partidos en vivo\n` +
          `• \`/tip brasil vs argentina\` para un partido próximo`
        );
        return true;
      }
      if (cmd.startsWith('/stats-vivo ') || cmd.startsWith('/statsvivo ') || cmd.startsWith('/live-stats ')) {
        const arg = text.replace(/^\/(stats-vivo|statsvivo|live-stats)(?:@\w+)?\s+/i, '').trim();
        const t = await mundialista365.getStatsVivo(arg);
        await sendMessage(chatId, t);
        return true;
      }

      // /alineacion <gameId> — titulares y formación
      if (cmd === '/alineacion' || cmd === '/alineacion@botmundialistabot' ||
          cmd === '/lineup' || cmd === '/lineup@botmundialistabot' ||
          cmd === '/titulares' || cmd === '/titulares@botmundialistabot') {
        await sendMessage(chatId,
          `👥 *ALINEACIONES*\n\n` +
          `Uso: \`/alineacion <gameId>\`\n\n` +
          `Ejemplo: \`/alineacion 4749268\`\n\n` +
          `💡 Las alineaciones se publican cerca del kickoff.`
        );
        return true;
      }
      if (cmd.startsWith('/alineacion ') || cmd.startsWith('/lineup ') || cmd.startsWith('/titulares ')) {
        const arg = text.replace(/^\/(alineacion|lineup|titulares)(?:@\w+)?\s+/i, '').trim();
        const t = await mundialista365.getAlineacion(arg);
        const game = await cache.getGameById(arg).catch(() => null);
        const homeBadge = game?.homeCompetitor?.id ? getTeamBadgeUrl(game.homeCompetitor.id, game.homeCompetitor.imageVersion) : null;
        const awayBadge = game?.awayCompetitor?.id ? getTeamBadgeUrl(game.awayCompetitor.id, game.awayCompetitor.imageVersion) : null;
        if (homeBadge && awayBadge) {
          await sendMediaGroup(chatId, [
            { type: 'photo', media: homeBadge },
            { type: 'photo', media: awayBadge }
          ]);
          await sendMessage(chatId, t);
        } else {
          await sendMessage(chatId, t);
        }
        return true;
      }

      // /previa <gameId> — pre-match stats
      if (cmd === '/previa' || cmd === '/previa@botmundialistabot' || cmd === '/preview' || cmd === '/preview@botmundialistabot') {
        await sendMessage(chatId,
          `🔮 *PREVIA DE PARTIDO*\n\n` +
          `Uso: \`/previa <gameId>\`\n\n` +
          `Ejemplo: \`/previa 4749268\`\n\n` +
          `💡 Las previas se generan para partidos programados (statusGroup=2).`
        );
        return true;
      }
      if (cmd.startsWith('/previa ') || cmd.startsWith('/preview ')) {
        const arg = text.replace(/^\/(previa|preview)(?:@\w+)?\s+/i, '').trim();
        const t = await mundialista365.getPrevia(arg);
        await sendMessage(chatId, t);
        return true;
      }

      // ===========================================================
      // TIER 1: Contenido del Mundial (365scores via Cosmos)
      // ===========================================================

      // /noticias [equipo]
      if (cmd === '/noticias' || cmd === '/noticias@botmundialistabot') {
        const t = await mundialistaStats.getNoticias({ equipo: null, limit: 10 });
        await sendMessage(chatId, t);
        return true;
      }
      if (cmd.startsWith('/noticias ') || cmd.startsWith('/noticias@botmundialistabot ')) {
        const arg = text.replace(/^\/noticias(?:@\w+)?\s+/i, '').trim();
        const t = await mundialistaStats.getNoticias({ equipo: arg, limit: 10 });
        await sendMessage(chatId, t);
        return true;
      }

      // /equipoideal /idealtm /tow
      if (cmd === '/equipoideal' || cmd === '/equipoideal@botmundialistabot' ||
          cmd === '/idealtm' || cmd === '/idealtm@botmundialistabot' ||
          cmd === '/tow' || cmd === '/tow@botmundialistabot') {
        const t = await mundialistaStats.getEquipoIdeal();
        await sendMessage(chatId, t);
        return true;
      }

      // /bracket [grupos|eliminatorias|todo]  /llaves
      if (cmd === '/bracket' || cmd === '/bracket@botmundialistabot' ||
          cmd === '/llaves' || cmd === '/llaves@botmundialistabot') {
        const t = await mundialistaStats.getBracket('eliminatorias');
        await sendMessage(chatId, t);
        return true;
      }
      if (cmd === '/bracket grupos' || cmd === '/bracket@botmundialistabot grupos' ||
          cmd === '/llaves grupos' || cmd === '/llaves@botmundialistabot grupos') {
        const t = await mundialistaStats.getBracket('grupos');
        await sendMessage(chatId, t);
        return true;
      }
      if (cmd === '/bracket todo' || cmd === '/bracket@botmundialistabot todo' ||
          cmd === '/bracket completo' || cmd === '/bracket@botmundialistabot completo') {
        const t = await mundialistaStats.getBracket('todo');
        await sendMessage(chatId, t);
        return true;
      }

      // /historial [año|equipo]
      if (cmd === '/historial' || cmd === '/historial@botmundialistabot') {
        const t = await mundialistaStats.getHistorial(null);
        await sendMessage(chatId, t);
        return true;
      }
      if (cmd.startsWith('/historial ') || cmd.startsWith('/historial@botmundialistabot ')) {
        const arg = text.replace(/^\/historial(?:@\w+)?\s+/i, '').trim();
        const t = await mundialistaStats.getHistorial(arg);
        await sendMessage(chatId, t);
        return true;
      }

      // /goleadores /rankinggoleador /topgoleador
      if (cmd === '/goleadores' || cmd === '/goleadores@botmundialistabot' ||
          cmd === '/rankinggoleador' || cmd === '/rankinggoleador@botmundialistabot' ||
          cmd === '/topgoleador' || cmd === '/topgoleador@botmundialistabot') {
        const t = await mundialistaStats.getGoleadores(10);
        if (t.photoUrl) {
          await sendPhoto(chatId, t.photoUrl, t.text);
        } else {
          await sendMessage(chatId, t.text);
        }
        return true;
      }

      // /jugador <nombre> — foto + info del jugador
      if (cmd.startsWith('/jugador') || cmd.startsWith('/jugador@botmundialistabot ')) {
        const name = text.replace(/^\/(jugador|buscar)(?:@\w+)?\s+/i, '').trim();
        if (!name) {
          await sendMessage(chatId, '📖 Uso: `/jugador <nombre>` — ej: `/jugador mbappe`');
          return true;
        }
        const matches = await cache.searchAthletes(name);
        if (!matches || !matches.length) {
          await sendMessage(chatId, `⚠️ No encontré al jugador "${name}".`);
          return true;
        }
        const athlete = matches[0];
        const position = athlete.formationPosition?.name || athlete.position?.name || '';
        const age = athlete.age ? `, ${athlete.age} años` : '';
        const msg = `⚽ *${athlete.name}*\n📌 ${position}${age}\n🆔 ID: ${athlete.id}`;
        const photoUrl = getAthletePhotoUrl(athlete.id);
        if (photoUrl) {
          await sendPhoto(chatId, photoUrl, msg);
        } else {
          await sendMessage(chatId, msg);
        }
        return true;
      }

      // /h2h <gameId> — historial entre equipos
      if (cmd === '/h2h' || cmd === '/h2h@botmundialistabot' || cmd === '/historial-partido' || cmd === '/historial-partido@botmundialistabot') {
        await sendMessage(chatId,
          `🤝 *HISTORIAL ENTRE EQUIPOS (H2H)*\n\n` +
          `Uso: \`/h2h <gameId>\`\n\n` +
          `Ejemplo: \`/h2h 4749268\``
        );
        return true;
      }
      if (cmd.startsWith('/h2h ') || cmd.startsWith('/historial-partido ')) {
        const arg = text.replace(/^\/(h2h|historial-partido)(?:@\w+)?\s+/i, '').trim();
        const t = await mundialista365.getH2H(arg);
        await sendMessage(chatId, t);
        return true;
      }

      return false;
  }
}

/**
 * Procesa las actualizaciones (mensajes)
 */
async function processUpdates(updates) {
  if (!updates.ok || !updates.result) return;

  for (const update of updates.result) {
    // Actualizar offset
    if (update.update_id >= offset) {
      offset = update.update_id + 1;
    }

    // Solo procesar mensajes de texto en chats privados
    const message = update.message;
    if (!message || !message.text) continue;
    if (message.chat.type !== 'private') continue;

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text.trim();
    const user = message.from.username || message.from.first_name;

    console.log(`📩 Telegram: [${user}] (${userId}) ${text}`);

    // Si es un comando, intentar manejarlo
    if (text.startsWith('/')) {
      const lowerText = text.toLowerCase();
      const botSuffix = '@botmundialistabot';
      const cleaned = lowerText.split(' ')[0].split('@')[0];

      if (cleaned === '/follow') {
        const args = text.replace(/^\/[a-z@0-9_]+/i, '').trim();
        const result = await followHandler.handleFollowCommand(String(userId), args);
        await sendMessage(chatId, result.message);
        continue;
      }
      if (cleaned === '/unfollow' || cleaned === '/dejarseguir') {
        const args = text.replace(/^\/[a-z@0-9_]+/i, '').trim();
        const result = await followHandler.handleUnfollowCommand(String(userId), args);
        await sendMessage(chatId, result.message);
        continue;
      }
      if (cleaned === '/misapuestas' || cleaned === '/siguiendo' || cleaned === '/siguiendo@botmundialistabot') {
        const result = await followHandler.handleListCommand(String(userId));
        await sendMessage(chatId, result.message);
        continue;
      }

      const handled = await handleCommand(chatId, text, user, String(userId));
      if (handled) continue;
      // Si no se reconoció el comando, intentar procesar el cuerpo (sin el /) como mensaje natural
      const textSinComando = text.replace(/^\/[a-z@0-9_]+\s*/i, '').trim();
      if (textSinComando) {
        const msgObj = {
          from: chatId.toString(),
          body: textSinComando,
          hasMedia: false,
          reply: async (t) => await sendMessage(chatId, t)
        };
        await messageHandler(null, msgObj);
        continue;
      }
    } else {
      // Mensaje no-comando: pasar por el conversational handler primero
      try {
        const result = await conversationalHandler.handleMessage(String(userId), text);
        if (result.handled && result.message) {
          await sendMessage(chatId, result.message);
          continue;
        }
      } catch (e) {
        console.error('[telegramBot] conversationalHandler error:', e.message);
      }
    }

    try {
      // Crear objeto message simulado para reutilizar messageHandler
      const messageObj = {
        from: chatId.toString(),
        body: text,
        hasMedia: false,
        reply: async (responseText) => {
          await sendMessage(chatId, responseText);
        }
      };

      // Llamar al messageHandler
      await messageHandler(null, messageObj);
    } catch (error) {
      console.error('Error procesando mensaje Telegram:', error);
      await sendMessage(chatId, '⚠️ Ocurrió un error. Intenta de nuevo.');
    }
  }
}

/**
 * Ciclo principal de polling
 */
async function pollingCycle() {
  if (!isRunning) return;

  try {
    const updates = await telegramRequest('getUpdates', {
      offset,
      timeout: 30
    });
    if (updates?.result?.length > 0) {
      console.log(`📩 Recibidos ${updates.result.length} update(s)`);
    }
    await processUpdates(updates);
    maybeHeartbeat();
  } catch (error) {
    console.error('Error en polling:', error.message);
  }

  // Continuar el loop
  if (isRunning) {
    setTimeout(pollingCycle, 500);
  }
}

// Heartbeat cada 5 min para confirmar que polling sigue vivo
let lastHeartbeat = Date.now();
function maybeHeartbeat() {
  if (Date.now() - lastHeartbeat > 5 * 60 * 1000) {
    console.log(`💓 Bot vivo | uptime=${Math.floor(process.uptime())}s | offset=${offset}`);
    lastHeartbeat = Date.now();
  }
}

/**
 * Inicializar bot
 */
async function init() {
  console.log('🚀 BotMundialista Telegram iniciando...');

  // No esperar DB connection (no bloqueante)
  testConnection().then(ok => {
    dbAvailable = ok;
    if (!dbAvailable) {
      console.log('⚠️ Modo demo activo (sin base de datos)');
    }
  }).catch(() => {
    console.log('⚠️ Modo demo activo (sin base de datos)');
  });

  // Obtener updates pendientes antes de iniciar polling
  try {
    const updates = await telegramRequest('getUpdates', { offset: 0, timeout: 0 });
    if (updates.ok && updates.result.length > 0) {
      offset = updates.result[updates.result.length - 1].update_id + 1;
      console.log(`📬 Limpiando ${updates.result.length} updates pendientes`);
    }
  } catch (error) {
    console.error('Error limpiando updates:', error.message);
  }

  // Iniciar polling
  isRunning = true;
  console.log('✅ BotMundialista Telegram listo!');
  console.log(`📱 Token: ${TELEGRAM_TOKEN?.substring(0, 10)}...`);
  console.log('');
  console.log('Comandos disponibles:');
  console.log('  - "¿Cómo quedó Brasil?"');
  console.log('  - "Brasil vs Argentina"');
  console.log('  - "Dame info de Alemania"');
  console.log('  - "Tabla del Mundial"');
  console.log('  - "Tabla Grupo A"');
  console.log('  - "Cuántos córners hizo Brasil?"');

  pollingCycle();
}

// Iniciar
init();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Apagando bot de Telegram...');
  isRunning = false;
  process.exit(0);
});
