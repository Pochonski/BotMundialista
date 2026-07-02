require('dotenv').config();
const cron = require('node-cron');

const api = require('./scores365Service');
const cosmos = require('../database/cosmos');

const MUNDIAL_ID = parseInt(process.env.SCORES365_COMPETITION_MUNDIAL || '5930', 10);
const POLL_MS = parseInt(process.env.SCORES365_POLL_MS || '25000', 10);
const CRON_EXPR = `*/${Math.max(15, Math.floor(POLL_MS / 1000))} * * * * *`;

function now() { return new Date().toISOString(); }
function log(msg) { console.log(`[live-poller ${now()}] ${msg}`); }

async function getLastUpdateId(gameId) {
  try {
    const state = await cosmos.getById('games', `state:${gameId}`, MUNDIAL_ID);
    return state?.lastUpdateId || 0;
  } catch (_) { return 0; }
}

async function setLastUpdateId(gameId, lastUpdateId) {
  await cosmos.upsert('games', {
    id: `state:${gameId}`,
    competitionId: MUNDIAL_ID,
    stateKey: `poll:${gameId}`,
    gameId,
    lastUpdateId,
    updatedAt: now(),
  });
}

async function pollGame(gameId) {
  const prevId = await getLastUpdateId(gameId);
  const data = await api.getGameStats(gameId, prevId || undefined);
  const newId = data.lastUpdateId || prevId;
  if (newId === prevId && prevId > 0) {
    return { gameId, status: 'no-change', lastUpdateId: prevId };
  }
  const statsCount = (data.statistics || []).length;
  const filtersCount = (data.statisticsFilters || []).length;
  await cosmos.upsert('game_snapshots', {
    id: `${gameId}-${newId}`,
    gameId: Number(gameId),
    lastUpdateId: newId,
    requestedUpdateId: data.requestedUpdateId,
    ttl: data.ttl,
    statistics: data.statistics || [],
    statisticsFilters: data.statisticsFilters || [],
    fetchedAt: now(),
  });
  await setLastUpdateId(gameId, newId);
  return { gameId, status: 'updated', lastUpdateId: newId, stats: statsCount, filters: filtersCount };
}

async function listLiveGames() {
  try {
    const current = await api.getGamesCurrent(MUNDIAL_ID);
    return (current.games || []).filter((g) => g.statusGroup === 1 || g.statusText === 'En vivo').map((g) => g.id);
  } catch (e) {
    log(`getGamesCurrent falló: ${e.message}`);
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
      log(`  ${id}: ${r.status} (${r.stats ?? 0} stats, lastUpdateId=${r.lastUpdateId})`);
    } catch (e) {
      log(`  ${id}: ERROR ${e.message}`);
    }
  }
}

let scheduledTask = null;

function start() {
  if (scheduledTask) return scheduledTask;
  log(`iniciando (cron: ${CRON_EXPR})`);
  scheduledTask = cron.schedule(CRON_EXPR, tick);
  tick();
  return scheduledTask;
}

function stop() {
  if (scheduledTask) scheduledTask.stop();
  scheduledTask = null;
}

if (require.main === module) {
  start();
  process.on('SIGINT', () => { stop(); process.exit(0); });
  process.on('SIGTERM', () => { stop(); process.exit(0); });
}

module.exports = { start, stop, tick, pollGame, listLiveGames };