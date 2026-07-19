const { pool } = require('../../../database/connection');
const { enrichTrend } = require('../utils/mappers');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);

async function getCompetitionTrends(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM trends WHERE scope = $1 AND entity_id = $2',
      ['competition', COMPETITION_ID]
    );
    const trends = rows.map(r => r.data);
    const seen = new Set();
    const unique = trends.filter(t => {
      const key = `${t.betCTA || ''}|${t.lineTypeId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json(unique.slice(0, 10).map(enrichTrend));
  } catch (err) {
    next(err);
  }
}

module.exports = { getCompetitionTrends };
