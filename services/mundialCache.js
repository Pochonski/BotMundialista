const { pool } = require('../database/connection');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);
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

function normalizeName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function getWorldCupGames({ date, onlyMajorGames = true, range = 1 } = {}) {
  if (date) {
    const key = `games:${date}:${onlyMajorGames}`;
    return cached(key, ttl(15 * 60 * 1000), async () => {
      const { rows } = await pool.query(
        'SELECT data FROM games WHERE competition_id = $1 AND DATE(start_time) = $2',
        [COMPETITION_ID, date]
      );
      return rows.map(r => r.data);
    });
  }
  return cached('games:today', ttl(15 * 60 * 1000), async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      'SELECT data FROM games WHERE competition_id = $1 AND DATE(start_time) = $2',
      [COMPETITION_ID, today]
    );
    return rows.map(r => r.data);
  });
}

async function getRecentWorldCupGames({ limit = 88 } = {}) {
  return cached('games:all', ttl(15 * 60 * 1000), async () => {
    const { rows } = await pool.query(
      'SELECT data FROM games WHERE competition_id = $1 ORDER BY start_time DESC',
      [COMPETITION_ID]
    );
    return rows.map(r => r.data);
  });
}

async function getWorldCupStandings() {
  return cached('standings', ttl(60 * 60 * 1000), async () => {
    const { rows } = await pool.query(
      'SELECT data FROM standings WHERE competition_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [COMPETITION_ID]
    );
    return rows.length ? rows[0].data : [];
  });
}

async function getMatchStats(gameId) {
  return cached(`stats:${gameId}`, ttl(15 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM game_stats WHERE game_id = $1', [gameId]);
    return rows.length ? (rows[0].data?.statistics || []) : [];
  });
}

async function getMatchOverview(gameId, matchupId) {
  return cached(`overview:${gameId}`, ttl(60 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM game_overviews WHERE game_id = $1', [gameId]);
    return rows.length ? rows[0].data : null;
  });
}

async function getMatchH2H(gameId, matchupId) {
  return cached(`h2h:${gameId}`, ttl(5 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM game_h2h WHERE game_id = $1', [gameId]);
    return rows.length ? rows[0].data : null;
  });
}

async function getMatchPreStats(gameId) {
  return cached(`prestats:${gameId}`, ttl(5 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM game_pre_stats WHERE game_id = $1', [gameId]);
    return rows.length ? rows[0].data : null;
  });
}

async function getTournamentTop() {
  return cached('tournamentTop', ttl(60 * 60 * 1000), async () => {
    const { rows } = await pool.query(
      'SELECT data FROM tournament_stats WHERE competition_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [COMPETITION_ID]
    );
    return rows.length ? rows[0].data : {};
  });
}

async function getTeamByName(name) {
  return cached(`team:${name}`, ttl(24 * 60 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM competitors WHERE name ILIKE $1', [`%${name}%`]);
    if (rows.length) {
      const t = rows[0].data;
      return { id: t.id, name: t.name, symbolicName: t.symbolicName, countryId: t.countryId, imageVersion: t.imageVersion };
    }
    const { rows: games } = await pool.query('SELECT data FROM games WHERE competition_id = $1', [COMPETITION_ID]);
    const target = normalizeName(name);
    for (const r of games) {
      for (const comp of [r.data.homeCompetitor, r.data.awayCompetitor]) {
        if (comp && normalizeName(comp.name) === target) {
          return { id: comp.id, name: comp.name, symbolicName: comp.symbolicName, countryId: comp.countryId, imageVersion: comp.imageVersion };
        }
      }
    }
    return null;
  });
}

async function getGameById(gameId) {
  return cached(`gameById:${gameId}`, ttl(5 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM game_overviews WHERE game_id = $1', [gameId]);
    return rows.length ? (rows[0].data?.game || null) : null;
  });
}

async function findGameByCompetitors(compIdA, compIdB) {
  const [a, b] = [Number(compIdA), Number(compIdB)];
  return cached(`findGame:${a}:${b}`, ttl(60 * 60 * 1000), async () => {
    const { rows } = await pool.query(
      'SELECT data FROM games WHERE competition_id = $1 AND ((home_competitor_id = $2 AND away_competitor_id = $3) OR (home_competitor_id = $3 AND away_competitor_id = $2)) LIMIT 1',
      [COMPETITION_ID, a, b]
    );
    return rows.length ? rows[0].data : null;
  });
}

async function getRecentWorldCupMatchesByTeam(teamId) {
  return cached(`teamMatches:${teamId}`, ttl(60 * 60 * 1000), async () => {
    const tid = Number(teamId);
    const { rows } = await pool.query(
      'SELECT data FROM games WHERE competition_id = $1 AND (home_competitor_id = $2 OR away_competitor_id = $2) ORDER BY start_time DESC',
      [COMPETITION_ID, tid]
    );
    return rows.map(r => r.data);
  });
}

async function searchAthletes(query) {
  const target = normalizeName(query);
  const parts = target.split(/\s+/);
  const athletes = await cached('athletes:all', ttl(24 * 60 * 60 * 1000), async () => {
    const { rows: overviewRows } = await pool.query(
      'SELECT data FROM game_overviews WHERE game_id IN (SELECT id FROM games WHERE competition_id = $1)',
      [COMPETITION_ID]
    );
    const seen = new Set();
    const result = [];
    for (const r of overviewRows) {
      const members = r.data?.members || r.data?.game?.members || [];
      for (const m of members) {
        if (m.id && !seen.has(m.id)) {
          seen.add(m.id);
          result.push({
            id: m.id, name: m.name, shortName: m.shortName,
            position: m.position, formationPosition: m.formationPosition,
            age: m.age, nationalTeamId: m.nationalTeamId, countryId: m.countryId,
          });
        }
      }
    }
    return result;
  });
  if (!athletes) return [];
  return athletes.filter((a) => {
    const n = normalizeName(a.name);
    const s = normalizeName(a.shortName || '');
    return parts.every((p) => n.includes(p) || s.includes(p));
  }).slice(0, 10);
}

async function getAthleteById(id) {
  return cached(`athlete:${id}`, ttl(24 * 60 * 60 * 1000), async () => {
    const { rows } = await pool.query('SELECT data FROM athletes WHERE id = $1', [id]);
    return rows.length ? rows[0].data : null;
  });
}

module.exports = {
  COMPETITION_ID,
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
  getGameById,
  findGameByCompetitors,
  searchAthletes,
  getAthleteById,
  clear,
  clearKey,
  CACHE,
};
