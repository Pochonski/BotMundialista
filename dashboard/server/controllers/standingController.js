const { pool } = require('../../../database/connection');
const scores365 = require('../../../services/scores365Service');
const images = require('../../../services/images');
const { GROUP_NAMES, transformStandingRow, enrichTeam } = require('../utils/mappers');
const { resolveCompetition } = require('../utils/competition');

async function getStandings(req, res, next) {
  try {
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const { competitionId, seasonNum } = resolved;

    // Cliente puede pedir otra etapa (Apertura, Annual, etc.) y temporada.
    const stageNum = req.query.stageNum != null ? parseInt(req.query.stageNum, 10) : 1;
    const requestedSeason = req.query.seasonNum != null ? parseInt(req.query.seasonNum, 10) : seasonNum;

    const { rows } = await pool.query(
      `SELECT data FROM standings
        WHERE competition_id = $1 AND stage_num = $2 AND season_num = $3`,
      [competitionId, stageNum, requestedSeason]
    );

    if (rows.length) {
      const apiData = rows[0].data;
      const stagesArr = apiData?.standings ?? [];
      if (stagesArr.length) {
        const standings = stagesArr[0].rows || [];
        const groupsMap = new Map();

        standings.forEach(r => {
          const gn = r.groupNum || 1;
          if (!groupsMap.has(gn)) {
            groupsMap.set(gn, { name: GROUP_NAMES[gn - 1] || `Grupo ${gn}`, rows: [] });
          }
          groupsMap.get(gn).rows.push(transformStandingRow(r, r.competitor?.id));
        });

        const groups = Array.from(groupsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([, g]) => ({
            ...g,
            displayName: stagesArr[0].displayName,
            isCurrentStage: stagesArr[0].isCurrentStage,
            rows: g.rows.sort((a, b) => a.position - b.position),
          }));

        return res.json(groups);
      }
    }

    // Si no hay cache, intenta en vivo.
    try {
      const live = await scores365.getStandings(competitionId, stageNum, requestedSeason);
      const stagesArr = live?.standings ?? [];
      if (!stagesArr.length) return res.json([]);

      const standings = stagesArr[0].rows || [];
      const groupsMap = new Map();
      standings.forEach(r => {
        const gn = r.groupNum || 1;
        if (!groupsMap.has(gn)) {
          groupsMap.set(gn, { name: GROUP_NAMES[gn - 1] || `Grupo ${gn}`, rows: [] });
        }
        groupsMap.get(gn).rows.push(transformStandingRow(r, r.competitor?.id));
      });
      const groups = Array.from(groupsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, g]) => ({
          ...g,
          displayName: stagesArr[0].displayName,
          isCurrentStage: stagesArr[0].isCurrentStage,
          rows: g.rows.sort((a, b) => a.position - b.position),
        }));
      return res.json(groups);
    } catch (_) {
      return res.json([]);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /standings/seasons?competitionId=X
 * Devuelve la lista de temporadas disponibles (para el selector).
 * Cache: tabla standings (seasonsFilter viene junto a /standings cuando
 * se llama con withSeasonsFilter=true).
 */
async function getStandingsSeasons(req, res, next) {
  try {
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const { competitionId, seasonNum } = resolved;

    // Reusar la cache: trae la última standings con withSeasonsFilter.
    const { rows } = await pool.query(
      `SELECT data FROM standings
        WHERE competition_id = $1
        ORDER BY season_num DESC LIMIT 1`,
      [competitionId]
    );
    if (rows.length) {
      const sf = rows[0].data?.seasonsFilter;
      if (Array.isArray(sf)) return res.json(sf);
    }

    // Fallback: pedir al upstream en vivo.
    try {
      const live = await scores365.getStandings(competitionId, 1, seasonNum, { withSeasonsFilter: true });
      const sf = live?.seasonsFilter;
      if (Array.isArray(sf)) return res.json(sf);
    } catch (_) { /* fallthrough */ }

    res.json([]);
  } catch (err) {
    next(err);
  }
}

function mapBrackets(doc) {
  const bracket = doc?.brackets?.[0];
  if (!bracket?.stages) return [];

  return bracket.stages
    .filter(s => {
      if (s.stageType === 1 || (!s.isFinal && !s.hasBrackets && s.num <= 2)) return false;
      const games = (s.groups || []).flatMap(g => g.games || []);
      return games.length > 0;
    })
    .map(s => {
      const allGames = (s.groups || []).flatMap(g => {
        return (g.games || []).map(gg => {
          const game = gg.game || gg;
          const home = game.homeCompetitor;
          const away = game.awayCompetitor;
          const homeScore = home?.score;
          const awayScore = away?.score;
          return {
            id: game.id || gg.gameId,
            homeTeam: home ? enrichTeam(home) : undefined,
            awayTeam: away ? enrichTeam(away) : undefined,
            score: (homeScore != null && awayScore != null)
              ? { home: homeScore, away: awayScore }
              : undefined,
            startTime: game.startTime || gg.startTime,
            status: game.statusGroup || game.status,
          };
        });
      });
      return {
        name: s.name,
        num: s.num,
        isFinal: s.isFinal || false,
        games: allGames,
      };
    });
}

async function getBrackets(req, res, next) {
  try {
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const { competitionId } = resolved;

    if (!resolved.comp.hasBrackets) {
      // Devolver empty array en lugar de 404 — la UI ya muestra empty state.
      return res.json([]);
    }

    const { rows } = await pool.query('SELECT data FROM brackets WHERE competition_id = $1', [competitionId]);
    if (rows.length) {
      const stages = mapBrackets(rows[0].data);
      if (stages.length) return res.json(stages);
    }

    try {
      const live = await scores365.getBrackets(competitionId);
      const stages = mapBrackets(live);
      if (stages.length) return res.json(stages);
    } catch (_) { /* fallthrough */ }

    res.json([]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStandings, getBrackets, getStandingsSeasons };
