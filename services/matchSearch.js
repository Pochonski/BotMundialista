require('dotenv').config();
const cosmos = require('../database/cosmos');
const { normalizeTeamName } = require('./mundialCache');

const MUNDIAL_ID = parseInt(process.env.SCORES365_COMPETITION_MUNDIAL || '5930', 10);

function stripDiacritics(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function competitorMatches(competitor, query) {
  if (!competitor || !query) return false;
  const name = stripDiacritics(competitor.name || '');
  const norm = stripDiacritics(normalizeTeamName(query) || query);
  return name.includes(norm) || norm.includes(name);
}

/**
 * Busca un partido entre dos equipos en el Mundial 2026.
 * Prioriza partidos próximos (statusGroup 2) o en vivo (statusGroup 1).
 * Si no encuentra, devuelve el último finalizado entre esos equipos.
 *
 * @param {string} homeQuery
 * @param {string} awayQuery
 * @returns {Promise<Object|null>} doc del container games o null
 */
async function findGameByTeams(homeQuery, awayQuery) {
  if (!homeQuery || !awayQuery) return null;

  const games = await cosmos.queryAll('games',
    'SELECT c.id, c.competitionId, c.statusGroup, c.statusText, c.startTime, c.homeCompetitor, c.awayCompetitor, c.stageName, c.groupNum FROM c WHERE c.competitionId = 5930 AND (c.statusGroup = 1 OR c.statusGroup = 2 OR c.statusGroup = 4)');

  const normalize = (s) => stripDiacritics(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const exactMatches = [];
  const fuzzyMatches = [];
  for (const g of games) {
    const h = normalize(g.homeCompetitor?.name);
    const a = normalize(g.awayCompetitor?.name);
    const hq = normalize(homeQuery);
    const aq = normalize(awayQuery);

    const exactForward = (h.includes(hq) || hq.includes(h)) && (a.includes(aq) || aq.includes(a));
    const exactReverse = (h.includes(aq) || aq.includes(h)) && (a.includes(hq) || hq.includes(a));
    if (exactForward || exactReverse) {
      exactMatches.push(g);
      continue;
    }

    const fuzzyForward = competitorMatches(g.homeCompetitor, homeQuery) && competitorMatches(g.awayCompetitor, awayQuery);
    const fuzzyReverse = competitorMatches(g.homeCompetitor, awayQuery) && competitorMatches(g.awayCompetitor, homeQuery);
    if (fuzzyForward || fuzzyReverse) {
      fuzzyMatches.push(g);
    }
  }

  const candidates = exactMatches.length ? exactMatches : fuzzyMatches;
  if (candidates.length === 0) return null;

  const score = (g) => {
    if (g.statusGroup === 1) return 3;
    if (g.statusGroup === 2) {
      const start = new Date(g.startTime).getTime();
      const now = Date.now();
      const delta = Math.abs(start - now);
      return 2 - Math.min(1, delta / (30 * 86400000));
    }
    return 1;
  };

  candidates.sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    return new Date(b.startTime) - new Date(a.startTime);
  });

  return candidates[0];
}

/**
 * Lista todos los partidos en vivo del Mundial (statusGroup=1).
 * @returns {Promise<Array>}
 */
async function findLiveGames() {
  try {
    return await cosmos.queryAll('games',
      'SELECT c.id, c.statusGroup, c.statusText, c.startTime, c.homeCompetitor, c.awayCompetitor, c.stageName FROM c WHERE c.competitionId = 5930 AND c.statusGroup = 1 ORDER BY c.startTime ASC');
  } catch (_) {
    return [];
  }
}

/**
 * Lista los próximos partidos del Mundial (statusGroup=2).
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function findUpcomingGames(limit = 10) {
  try {
    return await cosmos.queryAll('games',
      { query: 'SELECT c.id, c.statusGroup, c.statusText, c.startTime, c.homeCompetitor, c.awayCompetitor, c.stageName FROM c WHERE c.competitionId = 5930 AND c.statusGroup = 2 ORDER BY c.startTime ASC OFFSET 0 LIMIT @lim', parameters: [{ name: '@lim', value: limit }] });
  } catch (_) {
    return [];
  }
}

module.exports = {
  MUNDIAL_ID,
  findGameByTeams,
  findLiveGames,
  findUpcomingGames,
  competitorMatches,
};