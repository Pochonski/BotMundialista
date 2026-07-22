const scores365 = require('../../../services/scores365Service');
const images = require('../../../services/images');

/**
 * GET /teams/:id/info
 * Detalle completo de un equipo desde upstream (no cacheado). Usado en
 * /equipo/:id para mostrar info rica (color, popularityRank, mainCompetitionId).
 */
async function getTeamInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });

    try {
      const data = await scores365.getCompetitor(id, { withSeasons: true });
      const list = data?.competitors ?? [];
      const c = list[0] || data?.competitor;
      if (c) {
        return res.json({
          id: Number(c.id),
          name: c.name,
          shortName: c.shortName,
          symbolicName: c.symbolicName,
          nameForURL: c.nameForURL,
          countryId: c.countryId,
          sportId: c.sportId,
          type: c.type,
          popularityRank: c.popularityRank,
          imageVersion: c.imageVersion ?? 1,
          color: c.color,
          awayColor: c.awayColor,
          mainCompetitionId: c.mainCompetitionId,
          hasSquad: c.hasSquad,
          hasTransfers: c.hasTransfers,
          badgeUrl: images.getTeamBadgeUrl(c.id, c.imageVersion ?? 1),
          seasons: c.seasons ?? [],
        });
      }
    } catch (_) {
      // upstream failed, fall through to DB fallback
    }

    // Fallback: competitors table.
    const { pool } = require('../../../database/connection');
    const { rows } = await pool.query(
      'SELECT id, name, data FROM competitors WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });
    const t = rows[0].data || {};
    res.json({
      id: Number(rows[0].id),
      name: rows[0].name,
      shortName: t.shortName,
      symbolicName: t.symbolicName,
      countryId: t.countryId,
      imageVersion: t.imageVersion ?? 1,
      mainCompetitionId: t.mainCompetitionId,
      badgeUrl: images.getTeamBadgeUrl(rows[0].id, t.imageVersion ?? 1),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id/recent-form?numOfGames=5
 * Forma reciente de un equipo (últimos N partidos con outcome W/D/L).
 * Cache: NO. Cada request va al upstream; el TTL de 365scores es ~60s.
 */
async function getTeamRecentForm(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const numOfGames = Math.min(20, Math.max(1, parseInt(req.query.numOfGames) || 5));

    const data = await scores365.getCompetitorRecentForm(id, numOfGames);
    const games = data?.games ?? [];
    res.json(games);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id/upcoming
 * Próximos partidos de un equipo.
 */
async function getTeamUpcoming(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });

    const data = await scores365.getFixtures(id);
    const games = data?.games ?? [];
    res.json(games);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id/recent-matches
 * Partidos recientes finalizados de un equipo.
 */
async function getTeamRecentMatches(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });

    const data = await scores365.getGamesCurrent(id);
    const games = (data?.games ?? []).filter(g => g.statusGroup === 4);
    res.json(games);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTeamInfo,
  getTeamRecentForm,
  getTeamUpcoming,
  getTeamRecentMatches,
};
