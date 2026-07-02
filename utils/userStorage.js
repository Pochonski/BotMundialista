const fs = require('fs');
const path = require('path');
const { pool } = require('../database/connection');

const FILE = path.join(__dirname, '..', 'userNames.json');
const MAX_LEN = 100;

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } else {
      cache = {};
    }
  } catch (e) {
    console.error('userStorage: error leyendo', FILE, '-', e.message);
    cache = {};
  }
  return cache;
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('userStorage: error guardando', FILE, '-', e.message);
  }
}

function validateAlias(alias) {
  const trimmed = alias.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'vacío' };
  if (trimmed.length > MAX_LEN) return { ok: false, reason: `máximo ${MAX_LEN} caracteres` };
  return { ok: true, alias: trimmed };
}

async function setAlias(userId, alias) {
  const v = validateAlias(alias);
  if (!v.ok) return { ok: false, reason: v.reason };

  const data = load();
  data[userId] = {
    alias: v.alias,
    updatedAt: new Date().toISOString()
  };
  cache = data;
  save();

  let dbResult = { synced: false };
  try {
    await pool.query(
      `INSERT INTO usuarios (id, alias, estado) VALUES ($1, $2, 'registrado')
       ON CONFLICT (id) DO UPDATE SET alias = EXCLUDED.alias`,
      [userId, v.alias]
    );
    dbResult = { synced: true };
  } catch (e) {
    dbResult = { synced: false, error: e.message };
  }
  return { ok: true, alias: v.alias, ...dbResult };
}

function getAlias(userId) {
  const data = load();
  return data[userId]?.alias || null;
}

function getAll() {
  return { ...load() };
}

module.exports = { setAlias, getAlias, getAll, validateAlias, MAX_LEN };