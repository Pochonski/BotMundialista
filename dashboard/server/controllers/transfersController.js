const { pool } = require('../../../database/connection');
const scores365 = require('../../../services/scores365Service');
const images = require('../../../services/images');
const { resolveCompetition } = require('../utils/competition');

/**
 * GET /competitions/:id/transfers?teamId=9076
 * Devuelve los fichajes de una competición, opcionalmente filtrados por equipo.
 * Cache: tabla `competition_transfers` (sync cada 30 min).
 * Fallback: upstream en vivo si la cache está vacía.
 */
async function getCompetitionTransfers(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const competitionId = resolved.competitionId;

    const teamId = req.query.teamId != null ? parseInt(req.query.teamId, 10) : null;

    let rows;
    if (teamId) {
      const { rows: r } = await pool.query(
        `SELECT * FROM competition_transfers
          WHERE competition_id = $1
            AND (origin_id = $2 OR target_id = $2)
          ORDER BY time DESC NULLS LAST, transfer_id DESC`,
        [competitionId, teamId]
      );
      rows = r;
    } else {
      const { rows: r } = await pool.query(
        `SELECT * FROM competition_transfers
          WHERE competition_id = $1
          ORDER BY time DESC NULLS LAST, transfer_id DESC`,
        [competitionId]
      );
      rows = r;
    }

    if (!rows.length) {
      // Fallback: upstream en vivo.
      try {
        const data = await scores365.getTransfers(competitionId, { limit: 100 });
        const list = (data?.transfers ?? []).map(t => mapTransfer(t, competitionId));
        return res.json(list);
      } catch (_) {
        return res.json([]);
      }
    }

    res.json(rows.map(r => ({
      id: Number(r.transfer_id),
      athleteId: r.athlete_id != null ? Number(r.athlete_id) : null,
      originId: r.origin_id != null ? Number(r.origin_id) : null,
      targetId: r.target_id != null ? Number(r.target_id) : null,
      time: r.time,
      price: r.price,
      positionId: r.position_id != null ? Number(r.position_id) : null,
      isArrival: r.is_arrival,
      isDeparture: r.is_departure,
      statusId: r.status_id != null ? Number(r.status_id) : null,
      statusName: r.status_name,
      data: r.data,
    })));
  } catch (err) {
    next(err);
  }
}

/**
 * Devuelve fichajes agrupados por equipo (in/out counts).
 * Útil para el tab "Fichajes" en /competicion/:id.
 */
async function getCompetitionTransfersSummary(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' });
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const competitionId = resolved.competitionId;

    // Hydrate team info from competitors table — buscamos TODOS los equipos
    // involucrados en transfers de esta comp (origen o destino), no solo
    // los que tengan competition_id = X (los transfers pueden incluir equipos
    // externos como Bayern Munich, Real Madrid, etc.).
    const { rows: teams } = await pool.query(
      `SELECT DISTINCT t.id, t.name, t.data
         FROM competitors t
        WHERE t.id IN (
          SELECT origin_id FROM competition_transfers WHERE competition_id = $1 AND origin_id IS NOT NULL
          UNION
          SELECT target_id FROM competition_transfers WHERE competition_id = $1 AND target_id IS NOT NULL
        )`,
      [competitionId]
    );
    const teamMap = new Map(teams.map(t => [Number(t.id), {
      id: Number(t.id),
      name: t.name,
      shortName: t.data?.shortName,
      imageVersion: t.data?.imageVersion ?? 1,
      badgeUrl: images.getTeamBadgeUrl(t.id, t.data?.imageVersion ?? 1),
    }]));

    const { rows } = await pool.query(
      `SELECT team_id, arrivals, departures, (arrivals + departures) AS total
         FROM (
           SELECT
             COALESCE(origin_id, target_id) AS team_id,
             SUM(CASE WHEN target_id IS NOT NULL THEN 1 ELSE 0 END)::int AS arrivals,
             SUM(CASE WHEN origin_id  IS NOT NULL THEN 1 ELSE 0 END)::int AS departures
           FROM competition_transfers
           WHERE competition_id = $1
           GROUP BY COALESCE(origin_id, target_id)
         ) t
        ORDER BY total DESC`,
      [competitionId]
    );

    const summary = rows
      .filter(r => r.team_id != null)
      .map(r => {
        const t = teamMap.get(Number(r.team_id)) || { id: Number(r.team_id), name: `Team ${r.team_id}` };
        return {
          teamId: Number(r.team_id),
          name: t.name,
          shortName: t.shortName,
          badgeUrl: t.badgeUrl,
          arrivals: Number(r.arrivals),
          departures: Number(r.departures),
        };
      });

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /suggestions?competitionId=X
 * Devuelve sugerencias de partidos cacheadas.
 */
async function getGameSuggestions(req, res, next) {
  try {
    const resolved = await resolveCompetition(req, res);
    if (!resolved) return;
    const { competitionId } = resolved;

    const { rows } = await pool.query(
      `SELECT game_id, rank, data FROM game_suggestions
        WHERE competition_id = $1
        ORDER BY rank NULLS LAST, game_id ASC`,
      [competitionId]
    );

    if (!rows.length) {
      // Fallback upstream en vivo.
      try {
        const data = await scores365.getGameSuggestions(competitionId);
        return res.json((data?.suggestedGames ?? []).map(g => g));
      } catch (_) {
        return res.json([]);
      }
    }

    res.json(rows.map(r => r.data));
  } catch (err) {
    next(err);
  }
}

function mapTransfer(t, competitionId) {
  return {
    id: Number(t.id),
    athleteId: t.athleteId != null ? Number(t.athleteId) : null,
    originId: t.origin != null ? Number(t.origin) : null,
    targetId: t.target != null ? Number(t.target) : null,
    time: t.time ?? null,
    price: t.price ?? null,
    positionId: t.positionId != null ? Number(t.positionId) : null,
    isArrival: !!t.isArrival,
    isDeparture: !!t.isDeparture,
    statusId: t.statusId != null ? Number(t.statusId) : null,
    statusName: t.statusName ?? null,
    competitionId,
  };
}

module.exports = {
  getCompetitionTransfers,
  getCompetitionTransfersSummary,
  getGameSuggestions,
};
