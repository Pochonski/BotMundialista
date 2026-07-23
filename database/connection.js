require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  maxUses: 7500,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'scorehub',
};

if (process.env.SUPABASE_DB_URL) {
  poolConfig.connectionString = process.env.SUPABASE_DB_URL;
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || '';
  poolConfig.database = process.env.DB_NAME || 'postgres';
  poolConfig.ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Pool error (idle client):', err.message);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const r = await client.query('SELECT NOW() as now, current_database() as db');
    console.log(`Database connected (${r.rows[0].db}) @ ${r.rows[0].now.toISOString()}`);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
