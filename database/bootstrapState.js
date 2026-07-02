const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.scores365-state.json');
const TMP_FILE = STATE_FILE + '.tmp';

const DEFAULT_STATE = {
  version: 2,
  lastRun: null,
  catalog: { done: false, at: null },
  mundialStructure: { done: false, at: null },
  games: { ids: [], at: null },
  gameDetails: { ids: {}, at: null },
  preStats: { ids: [], at: null },
  standings: { done: false, at: null },
  tournamentStats: { ids: [], at: null },
  news: { competition: [], game: [], athlete: [], sport: [], at: null },
  trends: { competition: [], game: [], at: null },
  predictions: { ids: [], at: null },
  athletes: { fetched: [], failed: [], at: null, memberIdsByGame: {} },
  bettingTips: { ids: [], at: null },
};

let cache = null;

function loadState() {
  if (cache) return cache;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const txt = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(txt);
      cache = JSON.parse(JSON.stringify(DEFAULT_STATE));
      for (const key of Object.keys(DEFAULT_STATE)) {
        if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
          cache[key] = { ...cache[key], ...parsed[key] };
        } else if (parsed[key] !== undefined) {
          cache[key] = parsed[key];
        }
      }
    } else {
      cache = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } catch (_) {
    cache = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  return cache;
}

function saveState() {
  if (!cache) return;
  try {
    cache.lastRun = new Date().toISOString();
    fs.writeFileSync(TMP_FILE, JSON.stringify(cache, null, 2));
    try { fs.unlinkSync(STATE_FILE); } catch (_) {}
    fs.renameSync(TMP_FILE, STATE_FILE);
  } catch (e) {
    console.error('[bootstrapState] save failed:', e.message?.split('\n')[0] || e.message);
  }
}

function resetState() {
  cache = JSON.parse(JSON.stringify(DEFAULT_STATE));
  try { if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE); } catch (_) {}
}

function markCatalogDone() { loadState(); cache.catalog.done = true; cache.catalog.at = new Date().toISOString(); saveState(); }
function markMundialStructureDone() { loadState(); cache.mundialStructure.done = true; cache.mundialStructure.at = new Date().toISOString(); saveState(); }

function markGame(id) {
  loadState();
  const s = String(id);
  if (!cache.games.ids.includes(s)) cache.games.ids.push(s);
  cache.games.at = new Date().toISOString();
  saveState();
}

function markGameDetail(id, value) {
  loadState();
  cache.gameDetails.ids[String(id)] = value || new Date().toISOString();
  cache.gameDetails.at = new Date().toISOString();
  saveState();
}

function markPreStat(id) {
  loadState();
  const s = String(id);
  if (!cache.preStats.ids.includes(s)) cache.preStats.ids.push(s);
  cache.preStats.at = new Date().toISOString();
  saveState();
}

function markStandingsDone() { loadState(); cache.standings.done = true; cache.standings.at = new Date().toISOString(); saveState(); }

function markTournamentStat(id) {
  loadState();
  const s = String(id);
  if (!cache.tournamentStats.ids.includes(s)) cache.tournamentStats.ids.push(s);
  cache.tournamentStats.at = new Date().toISOString();
  saveState();
}

function markNews(scope, id) {
  loadState();
  if (!cache.news[scope]) cache.news[scope] = [];
  const s = String(id);
  if (!cache.news[scope].includes(s)) cache.news[scope].push(s);
  cache.news.at = new Date().toISOString();
  saveState();
}

function markTrend(scope, id) {
  loadState();
  if (!cache.trends[scope]) cache.trends[scope] = [];
  const s = String(id);
  if (!cache.trends[scope].includes(s)) cache.trends[scope].push(s);
  cache.trends.at = new Date().toISOString();
  saveState();
}

function markPrediction(id) {
  loadState();
  const s = String(id);
  if (!cache.predictions.ids.includes(s)) cache.predictions.ids.push(s);
  cache.predictions.at = new Date().toISOString();
  saveState();
}

function markAthleteFetched(id) {
  loadState();
  const s = String(id);
  if (!cache.athletes.fetched.includes(s)) cache.athletes.fetched.push(s);
  cache.athletes.failed = cache.athletes.failed.filter((x) => x !== s);
  cache.athletes.at = new Date().toISOString();
  saveState();
}

function markAthleteFailed(id) {
  loadState();
  const s = String(id);
  if (!cache.athletes.failed.includes(s)) cache.athletes.failed.push(s);
  cache.athletes.at = new Date().toISOString();
  saveState();
}

function setGameMembers(gameId, memberIds) {
  loadState();
  cache.athletes.memberIdsByGame[String(gameId)] = memberIds.map(String).filter((id) => id && id !== '0');
  saveState();
}

function getGameMembers(gameId) {
  loadState();
  return cache.athletes.memberIdsByGame[String(gameId)] || null;
}

function markBettingTip(id) {
  loadState();
  const s = String(id);
  if (!cache.bettingTips.ids.includes(s)) cache.bettingTips.ids.push(s);
  cache.bettingTips.at = new Date().toISOString();
  saveState();
}

function isAthleteDone(id) {
  loadState();
  const s = String(id);
  return cache.athletes.fetched.includes(s);
}

function isBettingTipDone(id) {
  loadState();
  const s = String(id);
  return cache.bettingTips.ids.includes(s);
}

function summary() {
  const s = loadState();
  return {
    lastRun: s.lastRun,
    catalog: s.catalog.done,
    mundialStructure: s.mundialStructure.done,
    games: s.games.ids.length,
    gameDetails: Object.keys(s.gameDetails.ids).length,
    preStats: s.preStats.ids.length,
    standings: s.standings.done,
    news: s.news.competition.length + s.news.game.length + s.news.athlete.length + s.news.sport.length,
    trends: s.trends.competition.length + s.trends.game.length,
    predictions: s.predictions.ids.length,
    athletesFetched: s.athletes.fetched.length,
    athletesFailed: s.athletes.failed.length,
    bettingTips: s.bettingTips.ids.length,
  };
}

module.exports = {
  loadState,
  saveState,
  resetState,
  markCatalogDone,
  markMundialStructureDone,
  markGame,
  markGameDetail,
  markPreStat,
  markStandingsDone,
  markTournamentStat,
  markNews,
  markTrend,
  markPrediction,
  markAthleteFetched,
  markAthleteFailed,
  markBettingTip,
  isAthleteDone,
  isBettingTipDone,
  setGameMembers,
  getGameMembers,
  summary,
  STATE_FILE,
};