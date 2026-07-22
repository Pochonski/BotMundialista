const scores365 = require('../../../services/scores365Service');

/**
 * GET /trends/details?trendId=12345
 * Detalle completo de un trend: texto, causa, juegos de soporte con outcome.
 */
async function getTrendDetails(req, res, next) {
  try {
    const trendId = parseInt(req.query.trendId, 10);
    if (!Number.isFinite(trendId)) return res.status(400).json({ error: 'trendId inválido' });

    const data = await scores365.getTrendDetails(trendId);
    const trend = data?.trend ?? null;
    const games = data?.games ?? [];
    res.json({
      trend,
      games: games.map(g => ({
        game: g.game,
        outcome: g.outcome,
        competitionId: g.competitionId,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTrendDetails };
