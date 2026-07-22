require('dotenv').config();
const cron = require('node-cron');

const api = require('./scores365Service');
const { pool } = require('../database/connection');
const notifier = require('./notifier');
const logger = require('../utils/logger');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);
const POLL_MS = parseInt(process.env.SCORES365_POLL_MS || '25000', 10);
const CRON_EXPR = `*/${Math.max(15, Math.floor(POLL_MS / 1000))} * * * * *`;

function now() { return new Date().toISOString(); }
function log(msg, extra) {
  if (extra) logger.info({ poller: 'live', ...extra }, msg);
  else logger.info({ poller: 'live' }, msg);
}

const previousStats = new Map();

async function getLastUpdateId(gameId) {
  try {
    const r = await pool.query('SELECT last_update_id FROM scores365_state WHERE game_id = $1', [Number(gameId)]);
    return r.rows[0]?.last_update_id || 0;
  } catch (_) { return 0; }
}

async function setLastUpdateId(gameId, lastUpdateId) {
  try {
    await pool.query(`
      INSERT INTO scores365_state (game_id, competition_id, last_update_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (game_id)
      DO UPDATE SET last_update_id = EXCLUDED.last_update_id, updated_at = NOW()
    `, [Number(gameId), COMPETITION_ID, lastUpdateId]);
  } catch (_) {}
}

function getStatValue(stats, id) {
  if (!stats) return null;
  for (const s of stats) {
    if (s.id === id) return parseInt(s.value) || 0;
  }
  return null;
}

function getCompetitorScore(stats, competitorId, statId) {
  if (!stats) return null;
  for (const s of stats) {
    if (s.id === statId && s.competitorId === competitorId) return parseInt(s.value) || 0;
  }
  return null;
}

function detectEvents(gameId, prevStats, newStats) {
  if (!prevStats || !newStats) return [];
  const events = [];

  const newHomeGoals = getStatValue(newStats, 1);
  const prevHomeGoals = getStatValue(prevStats, 1);
  if (newHomeGoals != null && prevHomeGoals != null && newHomeGoals > prevHomeGoals) {
    const diff = newHomeGoals - prevHomeGoals;
    for (let i = 0; i < diff; i++) {
      events.push({ type: 'goal:scored', gameId, team: 'local', score: `${newHomeGoals}-${getStatValue(newStats, 1, 'away') ?? 0}`, minute: null });
    }
  }

  const newAwayGoals = getStatValue(newStats, 1);
  const prevAwayGoals = getStatValue(prevStats, 1);

  const newCorners = getStatValue(newStats, 6);
  const prevCorners = getStatValue(prevStats, 6);
  if (newCorners != null && prevCorners != null && newCorners > prevCorners) {
    events.push({ type: 'corner', gameId, title: 'Córner', minute: null });
  }

  return events;
}

async function pollGame(gameId) {
  const prevId = await getLastUpdateId(gameId);
  const data = await api.getGameStats(gameId, prevId || undefined);
  const newId = data.lastUpdateId || prevId;
  const prevStats = previousStats.get(Number(gameId));
  const newStats = data.statistics || [];

  if (newId === prevId && prevId > 0) {
    previousStats.set(Number(gameId), newStats);
    return { gameId, status: 'no-change', lastUpdateId: prevId };
  }

  const detectedEvents = detectEvents(Number(gameId), prevStats, newStats);
  previousStats.set(Number(gameId), newStats);

  const statsCount = newStats.length;
  const filtersCount = (data.statisticsFilters || []).length;
  await setLastUpdateId(gameId, newId);

  for (const event of detectedEvents) {
    log(`  event detected: ${event.type} gameId=${gameId}`);
    notifier.emitMatchEvent(event.type, event);
  }

  return { gameId, status: 'updated', lastUpdateId: newId, stats: statsCount, filters: filtersCount, events: detectedEvents.length };
}

async function listLiveGames() {
  try {
    const current = await api.getGamesCurrent(COMPETITION_ID);
    return (current.games || []).filter((g) => g.statusGroup === 1 || g.statusText === 'En vivo').map((g) => g.id);
  } catch (e) {
    logger.error({ err: e, poller: 'live' }, 'getGamesCurrent falló');
    return [];
  }
}

async function tick() {
  const ids = await listLiveGames();
  if (!ids.length) {
    log('sin juegos en vivo');
    return;
  }
  log(`polling ${ids.length} juegos en vivo...`);
  for (const id of ids) {
    try {
      const r = await pollGame(id);
      log(`  ${id}: ${r.status} (${r.stats ?? 0} stats, ${r.events ?? 0} events)`);
    } catch (e) {
      logger.error({ err: e, poller: 'live', gameId: id }, 'pollGame ERROR');
    }
  }
  // Evacuar entries de juegos que ya no están en vivo (libera memoria y
  // previene usar snapshots viejos si se reutiliza un gameId).
  const liveSet = new Set(ids.map(Number));
  for (const key of previousStats.keys()) {
    if (!liveSet.has(key)) previousStats.delete(key);
  }
}

let scheduledTask = null;
let isRunning = false;

async function tickGuarded() {
  if (isRunning) {
    log('tick saltado: ya en curso');
    return;
  }
  isRunning = true;
  try {
    await tick();
  } catch (e) {
    logger.error({ err: e, poller: 'live' }, 'tick falló');
  } finally {
    isRunning = false;
  }
}

function start() {
  if (scheduledTask) return scheduledTask;
  log(`iniciando (cron: ${CRON_EXPR})`);
  scheduledTask = cron.schedule(CRON_EXPR, tickGuarded);
  tickGuarded();
  return scheduledTask;
}

function stop() {
  if (scheduledTask) scheduledTask.stop();
  scheduledTask = null;
}

if (require.main === module) {
  const { install: installProcessGuard } = require('../utils/processGuard');
  installProcessGuard({ name: 'liveGamesPoller' });
  start();
  process.on('SIGINT', () => { stop(); process.exit(0); });
  process.on('SIGTERM', () => { stop(); process.exit(0); });
}

module.exports = { start, stop, tick, pollGame, listLiveGames, previousStats };
