const { pool } = require('../../../database/connection');
const images = require('../../../services/images');
const scores365 = require('../../../services/scores365Service');
const { resolveCompetition, getActiveCompetitions, getActiveCompetitionIds, loadActiveCompetitions } = require('../utils/competition');

const DEFAULT_SEASON = parseInt(process.env.PRIMARY_SEASON || '25', 10);

async function getCountries(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT id, name FROM countries ORDER BY name');
    const countries = rows.map(r => ({
      id: r.id,
      name: r.name || '',
      flagUrl: images.getCountryFlagUrl(r.id),
    }));
    res.json(countries);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tournament-info?competitionId=5930
 * Devuelve info de una competición específica.
 */
async function getTournamentInfo(req, res, next) {
  try {
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const { competitionId, seasonNum, comp } = resolved;

    const { rows } = await pool.query('SELECT data FROM competitions WHERE id = $1', [competitionId]);
    if (!rows.length) {
      return res.json({
        id: competitionId,
        name: comp.displayName,
        seasonNum,
        format: 'Sin detalle disponible',
      });
    }
    const clist = rows[0].data?.competitions;
    const c = Array.isArray(clist) ? clist[0] : rows[0].data?.competition;
    if (!c) {
      return res.json({
        id: competitionId,
        name: comp.displayName,
        seasonNum,
        format: 'Sin detalle disponible',
      });
    }
    res.json({
      id: c.id,
      name: c.name || comp.displayName,
      nameForURL: c.nameForURL,
      countryId: c.countryId ?? comp.countryId,
      countryName: comp.countryName,
      seasonNum: c.currentSeasonNum || seasonNum,
      seasonLabel: comp.seasonLabel,
      imageVersion: c.imageVersion,
      hasBrackets: comp.hasBrackets,
      hasGroups: comp.hasGroups,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /competitions
 * Lista de competiciones activas (catálogo del sitio).
 */
async function getCompetitions(req, res, next) {
  try {
    const list = await getActiveCompetitions();
    res.json(list.map(c => ({
      id: c.id,
      displayName: c.displayName,
      shortName: c.shortName,
      countryId: c.countryId,
      countryName: c.countryName,
      seasonNum: c.seasonNum,
      seasonLabel: c.seasonLabel,
      startDate: c.startDate,
      endDate: c.endDate,
      isFeatured: c.isFeatured,
      displayOrder: c.displayOrder,
      hasBrackets: c.hasBrackets,
      hasGroups: c.hasGroups,
      hasHistory: c.hasHistory,
    })));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /competitions/featured
 * Solo las competiciones marcadas is_featured=true (para los tabs de la home).
 */
async function getFeaturedCompetitions(req, res, next) {
  try {
    const list = await getActiveCompetitions();
    res.json(
      list
        .filter(c => c.isFeatured)
        .map(c => ({
          id: c.id,
          displayName: c.displayName,
          shortName: c.shortName,
          countryId: c.countryId,
          countryName: c.countryName,
          seasonNum: c.seasonNum,
          seasonLabel: c.seasonLabel,
          isFeatured: c.isFeatured,
          displayOrder: c.displayOrder,
        }))
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /competitions/:id
 * Detalle completo (incluye seasons[] del upstream). Cacheado en `competitions`.
 */
async function getCompetitionDetail(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const { byId } = await loadActiveCompetitions();
    const comp = byId.get(id);
    if (!comp) return res.status(404).json({ error: 'Competición no disponible' });

    // 1. Cache DB
    const { rows } = await pool.query('SELECT data FROM competitions WHERE id = $1', [id]);
    if (rows.length) {
      const c = rows[0].data?.competitions?.[0] || rows[0].data?.competition;
      if (c) {
        return res.json({
          ...comp,
          upstream: c,
          hasTransfers: !!c.hasTransfers,
          seasons: c.seasons || [],
        });
      }
    }

    // 2. Fallback a upstream en vivo.
    try {
      const live = await scores365.getCompetition(id);
      const c = live?.competitions?.[0];
      if (c) {
        return res.json({
          ...comp,
          upstream: c,
          hasTransfers: !!c.hasTransfers,
          seasons: c.seasons || [],
        });
      }
    } catch (_) { /* fallthrough */ }

    res.json({ ...comp, upstream: null, seasons: [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /competitions/:id/seasons
 * Solo el array `seasons` del upstream.
 */
async function getCompetitionSeasons(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const { byId } = await loadActiveCompetitions();
    if (!byId.has(id)) return res.status(404).json({ error: 'Competición no disponible' });

    const { rows } = await pool.query('SELECT data FROM competitions WHERE id = $1', [id]);
    const c = rows[0]?.data?.competitions?.[0] || rows[0]?.data?.competition;
    if (c?.seasons?.length) return res.json(c.seasons);

    try {
      const live = await scores365.getCompetition(id);
      const c2 = live?.competitions?.[0];
      return res.json(c2?.seasons || []);
    } catch (_) {
      return res.json([]);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /competitions/:id/insights
 * Bundle completo de insights de una competición para el frontend:
 * tendencias, sugerencias (top upcoming games), outrights (campeón), top scorers
 * y próximos partidos destacados. Sirve para alimentar la pestaña "Análisis"
 * sin hacer 6 requests separados.
 *
 * Si una sección está vacía (porque la temporada aún no comienza), devolvemos
 * `count: 0` o `null` en vez de `[]`, para que el frontend pueda mostrar
 * un empty-state específico ("Se actualizará cuando arranque la temporada").
 */
async function getCompetitionInsights(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const competitionId = resolved.competitionId;
    const comp = resolved.comp;

    // Tendencias (competition-level).
    const trendsRes = await pool.query(
      `SELECT data FROM trends WHERE scope = 'competition' AND entity_id = $1
         ORDER BY (data->>'percentage')::numeric DESC NULLS LAST LIMIT 10`,
      [competitionId]
    );
    const trends = trendsRes.rows.map(r => r.data);

    // Sugerencias (top upcoming games cacheados en game_suggestions).
    const suggRes = await pool.query(
      `SELECT data FROM game_suggestions WHERE competition_id = $1
         ORDER BY rank NULLS LAST LIMIT 8`,
      [competitionId]
    );
    const suggestions = suggRes.rows.map(r => r.data);

    // Outrights (cuotas de campeón). El upstream puede devolver {} cuando la
    // temporada aún no tiene apuestas futuras publicadas — distinguimos
    // "sin datos" de "datos vacíos" devolviendo el objeto aunque esté vacío.
    const outrightRes = await pool.query(
      'SELECT data, updated_at FROM odds_outrights WHERE competition_id = $1',
      [competitionId]
    );
    const outrights = {
      available: outrightRes.rows.length > 0,
      updatedAt: outrightRes.rows[0]?.updated_at ?? null,
      data: outrightRes.rows[0]?.data ?? null,
    };

    // Top scorers / assists / ratings desde tournament_stats.
    const statsRes = await pool.query(
      'SELECT data, updated_at FROM tournament_stats WHERE competition_id = $1 ORDER BY season_num DESC LIMIT 1',
      [competitionId]
    );
    const topStats = statsRes.rows.length
      ? { ...extractTopStats(statsRes.rows[0].data), updatedAt: statsRes.rows[0].updated_at }
      : null;

    // Team of the week (cached en tabla team_of_week).
    const towRes = await pool.query(
      'SELECT data, updated_at FROM team_of_week WHERE competition_id = $1',
      [competitionId]
    );
    const teamOfWeek = towRes.rows.length
      ? { available: true, updatedAt: towRes.rows[0].updated_at, ...extractTeamOfWeek(towRes.rows[0].data) }
      : { available: false };

    // Próximos partidos destacados.
    const gamesRes = await pool.query(
      `SELECT data FROM games
        WHERE competition_id = $1
          AND status_group = 2
          AND start_time > NOW()
        ORDER BY start_time ASC LIMIT 5`,
      [competitionId]
    );
    const upcoming = gamesRes.rows.map(r => r.data);

    res.json({
      competitionId,
      season: {
        num: comp.seasonNum,
        label: comp.seasonLabel,
        startDate: comp.startDate,
        endDate: comp.endDate,
      },
      trends: { count: trends.length, items: trends },
      suggestions: { count: suggestions.length, items: suggestions },
      outrights,
      topStats,
      teamOfWeek,
      upcoming: { count: upcoming.length, items: upcoming },
    });
  } catch (err) {
    next(err);
  }
}

function extractTeamOfWeek(raw) {
  const lineup = raw?.teamOfTheWeek?.lineup || raw?.teamOfWeek?.lineup || null;
  if (!lineup) return null;
  const formation = lineup.formation || '4-4-2';
  const players = (lineup.members || []).map(m => ({
    name: m.name,
    shortName: m.shortName,
    position: m.position?.name || m.positionName || null,
    jersey: m.jerseyNumber ?? null,
    rating: m.ranking ?? null,
    athleteId: m.athleteId ?? m.id ?? null,
    photoUrl: (m.athleteId || m.id)
      ? `https://imagecache.365scores.com/image/upload/f_png,w_32,h_32,c_limit,q_auto:eco,dpr_3,r_max,c_thumb,g_face,z_0.65,d_Athletes:default.png/v${m.imageVersion || 26}/Athletes/NationalTeam/${m.athleteId || m.id}`
      : null,
  }));
  return { formation, players };
}

/**
 * Extrae top-5 scorers, top-5 assists y top-5 ratings de tournament_stats.
 * El upstream devuelve un objeto con categorías (Goals, Assists, Rating 365).
 */
function extractTopStats(raw) {
  if (!raw?.stats?.athletesStats) return null;
  const cats = Array.isArray(raw.stats.athletesStats)
    ? raw.stats.athletesStats
    : Object.values(raw.stats.athletesStats || {});

  const pickTop = (catId) => {
    const cat = cats.find(c => c.id === catId) || cats.find(c => c.name === catId);
    if (!cat?.rows) return [];
    return cat.rows.slice(0, 5).map(r => ({
      athleteId: r.entity?.id,
      name: r.entity?.name || r.entity?.shortName,
      teamName: r.entity?.competitorName || r.teamName || null,
      photoUrl: r.entity?.id ? `https://imagecache.365scores.com/image/upload/f_png,w_96,h_96,c_limit,q_auto:eco,dpr_1/v${r.entity.imageVersion || 1}/Athletes/${r.entity.id}` : null,
      value: r.value ?? r.stats?.[0]?.value ?? null,
    }));
  };

  return {
    scorers: pickTop(1),     // Goals
    assists: pickTop(3),     // Assists
    ratings: pickTop(7),     // Rating 365
  };
}

module.exports = {
  getCountries,
  getTournamentInfo,
  getCompetitions,
  getFeaturedCompetitions,
  getCompetitionDetail,
  getCompetitionSeasons,
  getCompetitionInsights,
};
