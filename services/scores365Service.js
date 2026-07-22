require('dotenv').config();

// Node 18+ incluye fetch global nativo; no necesitamos node-fetch.
const fetch = globalThis.fetch;
if (!fetch) {
  throw new Error('globalThis.fetch no está disponible. Se requiere Node 18+.');
}
const zlib = require('zlib');

const BASE = 'https://webws.365scores.com';
const TZ = process.env.SCORES365_TIMEZONE || 'America/Costa_Rica';
const COUNTRY = process.env.SCORES365_USER_COUNTRY || '153';
const LANG = process.env.SCORES365_LANG || '14';
const APPTYPE = process.env.SCORES365_APP_TYPE || '5';
const HTTP_TIMEOUT_MS = parseInt(process.env.SCORES365_HTTP_TIMEOUT_MS || '15000', 10);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0';

let lastCall = 0;
const MIN_INTERVAL_MS = parseInt(process.env.SCORES365_MIN_INTERVAL_MS || '120', 10);

function buildQuery(extra) {
  const base = `appTypeId=${APPTYPE}&langId=${LANG}&timezoneName=${encodeURIComponent(TZ)}&userCountryId=${COUNTRY}`;
  return extra ? `${base}&${extra}` : base;
}

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCall;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCall = Date.now();
}

async function get(path, extraQuery = '', baseUrl = BASE) {
  const url = `${baseUrl}${path}?${buildQuery(extraQuery)}`;
  await throttle();
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    // Timeout por intento: AbortController aborta el fetch colgado.
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5,es-CR;q=0.4',
          'Origin': 'https://www.365scores.com',
          'Referer': 'https://www.365scores.com/',
        },
        signal: ctrl.signal,
      });
      if (res.ok) break;
      if (res.status === 429 || res.status >= 500) {
        const delay = Math.min(8000, 1000 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    } catch (e) {
      // AbortError = timeout; reintentable como cualquier error de red.
      const isAbort = e.name === 'AbortError';
      if (attempt === 4) {
        const err = new Error(`365scores ${isAbort ? 'timeout' : 'network'}: ${path}`);
        err.status = 0;
        err.cause = e;
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  if (!res || !res.ok) {
    const err = new Error(`365scores ${res ? res.status : 'no-response'}: ${path}`);
    err.status = res ? res.status : 0;
    throw err;
  }
  const enc = res.headers.get('content-encoding');
  // fetch nativo (undici) no tiene .buffer(); usamos .arrayBuffer().
  let buf = Buffer.from(await res.arrayBuffer());
  if (enc && enc.includes('gzip')) {
    try { buf = zlib.gunzipSync(buf); } catch (_) { /* fallthrough */ }
  } else if (enc && enc.includes('br')) {
    try { buf = zlib.brotliDecompressSync(buf); } catch (_) { /* fallthrough */ }
  }
  return JSON.parse(buf.toString('utf8'));
}

const SEO_BASE = 'https://seo-management.365scores.com';

const api = {
  getSports: () => get('/web/sports/'),
  getCompetitionsFeatured: (sports = 1) => get('/web/competitions/featured/', `sports=${sports}&withSeasons=true&type=stats`),
  getCompetition: (id) => get('/web/competitions/', `competitions=${id}&withSeasons=true&withBestOdds=true&isDashboard=true`),
  getRelatedEntities: (competitionId) => get('/web/relatedEntities/', `competitions=${competitionId}`),
  getTopCompetitors: (limit = 30) => get('/web/competitors/top/', `limit=${limit}&promoteNational=true&withSeasons=true&isDashboard=true`),

  getGamesAllScores: (startDate, endDate, sports = 1, opts = {}) => {
    const params = [
      `sports=${sports}`,
      `startDate=${startDate}`,
      `endDate=${endDate}`,
      opts.showOdds ? 'showOdds=true' : '',
      opts.onlyMajorGames ? 'onlyMajorGames=true' : '',
      opts.withTop ? 'withTop=true' : '',
    ].filter(Boolean).join('&');
    return get('/web/games/allscores/', params);
  },
  getGamesFeatured: (sports = 1, numberOfGames = 4) => get('/web/games/featured/', `sports=${sports}&showOdds=true&numberOfGames=${numberOfGames}&context=1`),
  getGamesByCompetition: (competitionId, afterGame, direction = 1) => get('/web/games/', `competitions=${competitionId}&games=1&aftergame=${afterGame}&direction=${direction}&withmainodds=true`),
  getGamesCurrent: (competitionId) => get('/web/games/current/', `competitions=${competitionId}&showOdds=true&includeTopBettingOpportunity=1`),
  getGamesResults: (competitionId) => get('/web/games/results/', `competitions=${competitionId}&showOdds=true&includeTopBettingOpportunity=1`),
  getGameOverview: (gameId, matchupId) => get('/web/game/', `gameId=${gameId}${matchupId ? `&matchupId=${matchupId}` : ''}`),
  getGameH2H: (gameId, matchupId, addMainOdds = true) => get('/web/games/h2h/', `gameId=${gameId}${matchupId ? `&matchupId=${matchupId}` : ''}${addMainOdds ? '&addMainOdds=true' : ''}`),
  getGameSuggestions: (gameId, matchupId) => get('/web/games/suggestions/', `games=${gameId}&feedBy=1${matchupId ? `&matchupId=${matchupId}` : ''}`),
  getGameStats: (gameId, lastUpdateId, filterId) => get('/web/game/stats/', `games=${gameId}${lastUpdateId ? `&lastUpdateId=${lastUpdateId}` : ''}${filterId ? `&filterId=${filterId}` : ''}`),
  getGamePreStats: (gameId) => get('/web/stats/preGame', `game=${gameId}&onlyMajor=true`),
  // Endpoint dedicado de alineaciones: trae members con name, athleteId,
  // jerseyNumber, imageVersion, position, formation, stats[] por jugador,
  // yardFormation (posicion en cancha), ranking (rating), heatMap.
  getGameLineups: (gameId) => get('/web/athletes/games/lineups', `gameId=${gameId}`),
  // Noticias especificas de un partido.
  getGameNews: (gameId) => get('/web/news/', `games=${gameId}&isPreview=false`),

  getTournamentStats: (competitionId, seasonNum, competitors = '') => get('/web/stats/', `competitions=${competitionId}${seasonNum ? `&seasonNum=${seasonNum}` : ''}${competitors ? `&competitors=${competitors}` : ''}&withSeasons=true`),
  getStandings: (competitionId, stageNum, seasonNum) => get('/web/standings/', `competitions=${competitionId}&live=false&isPreview=true&stageNum=${stageNum}&seasonNum=${seasonNum}`),
  getBrackets: (competitionId) => get('/web/brackets/', `competitions=${competitionId}&live=false`),
  getCompetitionHistory: (competitionId) => get('/web/competitions/history/', `competitions=${competitionId}`),
  getFixtures: (competitionId) => get('/web/games/fixtures/', `competitions=${competitionId}&showOdds=true&includeTopBettingOpportunity=1`),
  getTeamOfWeek: (competitionId) => get('/web/competitions/teamoftheweek/', `competitions=${competitionId}`),

  getPredictions: (sports = 1, competitors = '') => get('/web/games/predictions/', `sports=${sports}${competitors ? `&competitors=${competitors}` : ''}`),
  getOddsLines: (gameId) => get('/web/bets/lines/', `games=${gameId}`),
  getOutrights: (competitionId) => get('/web/bets/outrights/', `competition=${competitionId}&sport=1`),

  getAthlete: (athleteId, fullDetails = true) => get('/web/athletes/', `athletes=${athleteId}${fullDetails ? '&fullDetails=true' : ''}`),
  getAthleteNextGame: (athleteId) => get('/web/athletes/nextGame', `athletes=${athleteId}&fullDetails=true`),
  getAthleteGames: (athleteId) => get('/web/athletes/games/', `athleteId=${athleteId}`),
  getAthleteChartEvents: (athleteId) => get('/web/athletes/chartEvents', `athletes=${athleteId}`),

  getTrends: (scope, id) => {
    const paramName = scope === 'game' ? 'games' : scope === 'competition' ? 'competition' : 'sportType';
    const extra = scope === 'sport'
      ? `${paramName}=${id}&date=${new Date().toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}&isTop=true`
      : scope === 'competition' ? `${paramName}=${id}&isTop=true` : `${paramName}=${id}`;
    return get('/web/trends/', extra);
  },

  getNews: (scope, id) => {
    const paramName = ({ sport: 'sports', competition: 'competitions', game: 'games', athlete: 'athletes' })[scope];
    const extra = `${paramName}=${id}${scope === 'sport' ? '&isPreview=true' : '&isPreview=false'}`;
    return get('/web/news/', extra);
  },

  getEntityDescription: (entityType, entityId, sectionNames = 'ENTITY_DESCRIPTION') =>
    get('/sections/', `appTypeId=${APPTYPE}&langId=${LANG}&timezoneName=${encodeURIComponent(TZ)}&userCountryId=${COUNTRY}&apiType=webws&sportType=1&entityType=${entityType}&entityId=${entityId}&sectionNames=${sectionNames}&activateLinks=true`, SEO_BASE),
};

module.exports = api;