const { pool } = require('../../../database/connection');
const images = require('../../../services/images');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);
const CURRENT_SEASON = parseInt(process.env.PRIMARY_SEASON || '25', 10);

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

async function getTournamentInfo(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT data FROM competitions WHERE id = $1', [COMPETITION_ID]);
    if (!rows.length) {
      return res.json({
        id: COMPETITION_ID,
        name: 'Torneo',
        seasonNum: CURRENT_SEASON,
        format: '48 equipos, 12 grupos, fase eliminatoria',
      });
    }
    const clist = rows[0].data?.competitions;
    const c = Array.isArray(clist) ? clist[0] : rows[0].data?.competition;
    if (!c) {
      return res.json({
        id: COMPETITION_ID,
        name: 'Torneo',
        seasonNum: CURRENT_SEASON,
        format: '48 equipos, 12 grupos, fase eliminatoria',
      });
    }
    res.json({
      id: c.id,
      name: c.name,
      nameForURL: c.nameForURL,
      countryId: c.countryId,
      seasonNum: c.currentSeasonNum || CURRENT_SEASON,
      imageVersion: c.imageVersion,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCountries, getTournamentInfo };
