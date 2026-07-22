const { pool } = require('../../../database/connection');
const scores365 = require('../../../services/scores365Service');
const images = require('../../../services/images');
const { GROUP_NAMES, transformStandingRow, enrichTeam } = require('../utils/mappers');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);
const CURRENT_SEASON = parseInt(process.env.PRIMARY_SEASON || '25', 10);

async function getStandings(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM standings WHERE competition_id = $1 AND stage_num = 1 AND season_num = $2',
      [COMPETITION_ID, CURRENT_SEASON]
    );
    if (!rows.length) return res.json([]);

    const apiData = rows[0].data;
    if (!apiData?.standings?.length) return res.json([]);

    const standings = apiData.standings[0].rows || [];
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
        rows: g.rows.sort((a, b) => a.position - b.position),
      }));

    res.json(groups);
  } catch (err) {
    next(err);
  }
}

/**
 * Mapea la estructura de brackets de 365scores a la del frontend.
 *
 * Estructura del upstream:
 *   brackets[0].stages[] -> cada stage tiene { num, name, stageType, isFinal, groups[] }
 *   cada group tiene { name, games[] }
 *   cada game del bracket es { gameId, venue, game: { id, homeCompetitor, awayCompetitor, ... } }
 *
 * Hay que aplanar groups[].games[] a un solo games[] por stage, extraer el
 * objeto interno .game (que tiene los competitors con scores), y filtrar
 * solo las stages de eliminatoria (stageType > 1 o isFinal=true), porque la
 * fase de grupos se ve en Standings.
 */
function mapBrackets(doc) {
  const bracket = doc?.brackets?.[0];
  if (!bracket?.stages) return [];

  return bracket.stages
    .filter(s => {
      // Excluir fase de grupos (stageType=1 o sin hasBrackets).
      if (s.stageType === 1 || (!s.isFinal && !s.hasBrackets && s.num <= 2)) return false;
      // Incluir solo stages que tienen games de eliminatoria.
      const games = (s.groups || []).flatMap(g => g.games || []);
      return games.length > 0;
    })
    .map(s => {
      // Aplanar groups[].games[] y extraer gg.game.
      const allGames = (s.groups || []).flatMap(g => {
        return (g.games || []).map(gg => {
          const game = gg.game || gg; // fallback por si no viene envuelto
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
    // 1. Cache en DB.
    const { rows } = await pool.query('SELECT data FROM brackets WHERE competition_id = $1', [COMPETITION_ID]);
    if (rows.length) {
      const stages = mapBrackets(rows[0].data);
      if (stages.length) return res.json(stages);
    }

    // 2. Fallback a API en vivo.
    try {
      const live = await scores365.getBrackets(COMPETITION_ID);
      const stages = mapBrackets(live);
      if (stages.length) return res.json(stages);
    } catch (_) { /* fallthrough */ }

    res.json([]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStandings, getBrackets };
