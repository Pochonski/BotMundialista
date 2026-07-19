const { pool } = require('../../../database/connection');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);

async function getNews(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const scope = req.query.scope || 'competition';
    const entityId = scope === 'competition' ? COMPETITION_ID : COMPETITION_ID;

    const { rows } = await pool.query(
      'SELECT data FROM news WHERE scope = $1 AND entity_id = $2 ORDER BY publish_date DESC NULLS LAST',
      [scope, entityId]
    );
    const allNews = rows.map(r => {
      const n = r.data;
      return {
        id: n.id,
        title: n.title,
        publishDate: n.publishDate,
        image: n.image || null,
        url: n.url,
        sourceId: n.sourceId,
        gameId: n.gameId,
      };
    });

    const offset = (page - 1) * limit;
    res.json(allNews.slice(offset, offset + limit));
  } catch (err) {
    next(err);
  }
}

async function getNewsByGame(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT data FROM news WHERE scope = $1 AND entity_id = $2 ORDER BY publish_date DESC NULLS LAST',
      ['game', Number(id)]
    );
    const data = rows.map(r => {
      const n = r.data;
      return {
        id: n.id,
        title: n.title,
        publishDate: n.publishDate,
        image: n.image || null,
        url: n.url,
        sourceId: n.sourceId,
      };
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getNews, getNewsByGame };
