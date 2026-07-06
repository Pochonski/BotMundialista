// Cache wrapper para datos de 365scores del Mundial 2026
// Evita rate-limiting y reduce latencia
const scores365 = require('./scores365Service');
const cosmos = require('../database/cosmos');
const MUNDIAL_ID = parseInt(process.env.SCORES365_COMPETITION_MUNDIAL || '5930', 10);
const CACHE = new Map();

function ttl(ms) { return ms; }

async function cached(key, ttlMs, fetcher) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.value;
  try {
    const value = await fetcher();
    CACHE.set(key, { ts: Date.now(), value });
    return value;
  } catch (e) {
    return hit ? hit.value : null;
  }
}

function clear() { CACHE.clear(); }
function clearKey(key) { CACHE.delete(key); }

async function getWorldCupGames({ date, onlyMajorGames = true, range = 1 } = {}) {
  if (date) {
    const key = `games:${date}:${onlyMajorGames}`;
    return cached(key, ttl(15 * 60 * 1000), async () => {
      const data = await scores365.getGamesAllScores(date, date, MUNDIAL_ID === 5930 ? 1 : 1, { onlyMajorGames, withTop: true, showOdds: true });
      const games = (data.games || []).filter((g) => g.competitionId === MUNDIAL_ID);
      return games;
    });
  }
  return cached('games:today', ttl(15 * 60 * 1000), async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const data = await scores365.getGamesAllScores(today, today, 1, { onlyMajorGames, withTop: true, showOdds: true });
    return (data.games || []).filter((g) => g.competitionId === MUNDIAL_ID);
  });
}

async function getRecentWorldCupGames({ limit = 88 } = {}) {
  return cached('games:all', ttl(15 * 60 * 1000), async () => {
    const startDate = '20260611';
    const endDate = '20260815';
    const all = [];
    let cursor = startDate;
    while (cursor < endDate) {
      try {
        const data = await scores365.getGamesAllScores(cursor, cursor, 1, { onlyMajorGames: true, withTop: true, showOdds: true });
        const games = (data.games || []).filter((g) => g.competitionId === MUNDIAL_ID);
        all.push(...games);
        const d = `${cursor.slice(0,4)}-${cursor.slice(4,6)}-${cursor.slice(6,8)}`;
        const next = new Date(d); next.setDate(next.getDate() + 1);
        cursor = next.toISOString().slice(0,10).replace(/-/g,'');
      } catch (e) { break; }
    }
    return all;
  });
}

async function getWorldCupStandings() {
  return cached('standings', ttl(60 * 60 * 1000), async () => {
    const data = await scores365.getStandings(MUNDIAL_ID, 1, 25);
    return data?.standings || [];
  });
}

async function getMatchStats(gameId) {
  return cached(`stats:${gameId}`, ttl(15 * 1000), async () => {
    const data = await scores365.getGameStats(gameId);
    return data?.statistics || [];
  });
}

async function getMatchOverview(gameId, matchupId) {
  return cached(`overview:${gameId}:${matchupId}`, ttl(60 * 60 * 1000), async () => {
    const data = await scores365.getGameOverview(gameId, matchupId);
    return data;
  });
}

async function getMatchH2H(gameId, matchupId) {
  return cached(`h2h:${gameId}:${matchupId}`, ttl(5 * 60 * 1000), async () => {
    const data = await scores365.getGameH2H(gameId, matchupId);
    return data;
  });
}

async function getMatchPreStats(gameId) {
  return cached(`prestats:${gameId}`, ttl(5 * 60 * 1000), async () => {
    const data = await scores365.getGamePreStats(gameId);
    return data;
  });
}

async function getTournamentTop() {
  return cached('tournamentTop', ttl(60 * 60 * 1000), async () => {
    const data = await scores365.getTournamentStats(MUNDIAL_ID, 25);
    return data?.stats || {};
  });
}

async function getTeamByName(name) {
  return cached(`team:${name}`, ttl(24 * 60 * 60 * 1000), async () => {
    let competitors = await cosmos.queryAll('catalog',
      { query: 'SELECT c.id, c.name, c.symbolicName, c.countryId, c.imageVersion FROM c WHERE c.entityType = @t', parameters: [{ name: '@t', value: 'competitors' }] });
    if (!competitors || !competitors.length) {
      const data = await scores365.getTopCompetitors(60);
      competitors = (data.competitors || []).map((c) => ({
        id: c.id, name: c.name, symbolicName: c.symbolicName, countryId: c.countryId, imageVersion: c.imageVersion,
      }));
      for (const c of competitors) {
        await cosmos.upsert('catalog', {
          id: `competitors-${c.id}`,
          entityType: 'competitors',
          ...c,
          _fetchedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const target = norm(name);
    return competitors.find((c) => norm(c.name) === target || norm(c.name).includes(target) || norm(c.symbolicName || '').includes(target)) || null;
  });
}

async function getRecentWorldCupMatchesByTeam(teamId) {
  return cached(`teamMatches:${teamId}`, ttl(5 * 60 * 1000), async () => {
    let after = '';
    const all = [];
    for (let page = 0; page < 3; page++) {
      const data = await scores365.getGamesByCompetition(MUNDIAL_ID, after || undefined, 1);
      const games = (data.games || []).filter((g) => g.homeCompetitor?.id === teamId || g.awayCompetitor?.id === teamId);
      all.push(...games);
      if (!data.games || data.games.length === 0) break;
      after = data.games[data.games.length - 1].id;
    }
    return all;
  });
}

module.exports = {
  MUNDIAL_ID,
  getWorldCupGames,
  getRecentWorldCupGames,
  getWorldCupStandings,
  getMatchStats,
  getMatchOverview,
  getMatchH2H,
  getMatchPreStats,
  getTournamentTop,
  getTeamByName,
  getRecentWorldCupMatchesByTeam,
  clear,
  clearKey,
  CACHE,
};