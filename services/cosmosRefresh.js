require('dotenv').config();
const cron = require('node-cron');

const api = require('./scores365Service');
const cosmos = require('../database/cosmos');

const MUNDIAL_ID = parseInt(process.env.SCORES365_COMPETITION_MUNDIAL || '5930', 10);

function now() { return new Date().toISOString(); }
function log(msg) { console.log(`[refresh ${now()}] ${msg}`); }

function ddmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

async function refreshCatalog() {
  log('refresh catalog...');
  const sports = await api.getSports();
  const sportsDocs = (sports.sports || []).map((s) => ({ id: `sports-${s.id}`, entityType: 'sports', ...s }));
  await cosmos.bulkInsert('catalog', sportsDocs);
  const compsDocs = (sports.competitions || []).map((c) => ({ id: `competitions-${c.id}`, entityType: 'competitions', ...c }));
  await cosmos.bulkInsert('catalog', compsDocs);
  log(`  → ${sportsDocs.length} sports, ${compsDocs.length} competitions`);
}

async function refreshGamesToday() {
  log('refresh games today...');
  const today = new Date();
  const end = addDays(today, 1);
  const res = await api.getGamesAllScores(ddmmyyyy(today), ddmmyyyy(end), 1, { onlyMajorGames: true, withTop: true, showOdds: true });
  const docs = (res.games || []).filter((g) => g.competitionId === MUNDIAL_ID).map((g) => ({
    id: String(g.id), competitionId: MUNDIAL_ID, ...g, _fetchedAt: now(),
  }));
  if (docs.length) await cosmos.bulkInsert('games', docs);
  log(`  → ${docs.length} games today`);
}

async function refreshNews() {
  log('refresh news (competition)...');
  const news = await api.getNews('competition', MUNDIAL_ID);
  if (news.news) {
    const docs = news.news.map((n) => ({
      id: `comp-${n.id}`, scope: 'competition', competitionId: MUNDIAL_ID, ...n, _fetchedAt: now(),
    }));
    await cosmos.bulkInsert('news', docs);
    log(`  → ${docs.length} news`);
  }
}

async function refreshTrends() {
  log('refresh trends (competition top)...');
  const trends = await api.getTrends('competition', MUNDIAL_ID);
  if (trends.trends) {
    const docs = trends.trends.map((t) => ({
      id: `comp-${MUNDIAL_ID}-${t.id}`, scope: 'competition', competitionId: MUNDIAL_ID, ...t, _fetchedAt: now(),
    }));
    await cosmos.bulkInsert('trends', docs);
    log(`  → ${docs.length} trends`);
  }
}

async function refreshStandings() {
  log('refresh standings (group stage)...');
  const stand = await api.getStandings(MUNDIAL_ID, 1, 25);
  await cosmos.upsert('standings', {
    id: `${MUNDIAL_ID}-s1-se25`, competitionId: MUNDIAL_ID, stageNum: 1, seasonNum: 25, ...stand, _fetchedAt: now(),
  });
  log('  → 1 standings doc');
}

async function refreshPredictions() {
  log('refresh predictions...');
  const predictions = await api.getPredictions(1, '');
  if (predictions.games) {
    const docs = predictions.games
      .filter((g) => g.competitionId === MUNDIAL_ID)
      .map((g) => ({ id: String(g.id), gameId: Number(g.id), ...g, _fetchedAt: now() }));
    await cosmos.bulkInsert('predictions', docs);
    log(`  → ${docs.length} predictions`);
  }
}

async function refreshGameTrends() {
  log('refresh trends per upcoming game...');
  const today = new Date();
  const future = addDays(today, 7);
  const res = await api.getGamesAllScores(ddmmyyyy(today), ddmmyyyy(future), 1, { onlyMajorGames: true, withTop: true });
  const upcoming = (res.games || []).filter((g) => g.competitionId === MUNDIAL_ID && g.statusGroup === 2);
  log(`  → ${upcoming.length} partidos próximos, consultando trends...`);
  for (const g of upcoming) {
    try {
      const t = await api.getTrends('game', g.id);
      if (t.trends) {
        const docs = t.trends.map((trend) => ({
          id: `game-${g.id}-${trend.id}`,
          scope: 'game',
          gameId: Number(g.id),
          competitionId: MUNDIAL_ID,
          ...trend,
          _fetchedAt: now(),
        }));
        await cosmos.bulkInsert('trends', docs);
      }
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      log(`    ! game ${g.id}: ${e.message}`);
    }
  }
}

async function tick() {
  try {
    await refreshCatalog();
    await refreshGamesToday();
    await refreshNews();
    await refreshTrends();
    await refreshStandings();
    await refreshPredictions();
    await refreshGameTrends();
    log('refresh completo ✓');
  } catch (e) {
    log(`ERROR: ${e.message}`);
  }
}

let scheduledTask = null;

function start() {
  if (scheduledTask) return scheduledTask;
  log('iniciando (cron: 0 */6 * * *)');
  scheduledTask = cron.schedule('0 */6 * * *', tick);
  log('primera corrida en 30s...');
  setTimeout(tick, 30000);
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

module.exports = { start, stop, tick };