const fs = require('fs');
const path = require('path');
const { pool } = require('../database/connection');
const db = require('../database/db');

const FILE = path.join(__dirname, '..', 'userNames.json');
const MAX_LEN = 100;

// Peticiones de reset pendientes: userId -> timestamp
const resetRequests = new Map();
const RESET_TTL_MS = 5 * 60 * 1000; // 5 minutos para confirmar

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
    await db.execAdvanced(
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

/**
 * Marca que un usuario pidió reset y está pendiente de confirmación
 */
function markPendingReset(userId) {
  resetRequests.set(String(userId), Date.now());
}

function consumePendingReset(userId) {
  const key = String(userId);
  const t = resetRequests.get(key);
  if (!t) return false;
  resetRequests.delete(key);
  if (Date.now() - t > RESET_TTL_MS) return false;
  return true;
}

function cancelPendingReset(userId) {
  resetRequests.delete(String(userId));
}

/**
 * Borra TODOS los datos del usuario (apodo local, equipos seguidos, historial)
 * @returns {Object} { deleted: { alias, equipos_seguidos, historial_consultas } }
 */
async function clearUserData(userId) {
  const result = { alias: 0, equipos_seguidos: 0, historial_consultas: 0 };

  // 1) Alias local
  const data = load();
  if (data[userId]) {
    delete data[userId];
    cache = data;
    save();
    result.alias = 1;
  }

  // 2) DB
  try {
    const r1 = await db.execAdvanced(`DELETE FROM equipos_seguidos WHERE id_usuario = $1`, [userId]);
    result.equipos_seguidos = r1.length;
    const r2 = await db.execAdvanced(`DELETE FROM historial_consultas WHERE id_usuario = $1`, [userId]);
    result.historial_consultas = r2.length;
    await db.execAdvanced(`DELETE FROM usuarios WHERE id = $1`, [userId]);
  } catch (e) {
    // DB opcional
  }
  cancelPendingReset(userId);
  return result;
}

module.exports = {
  setAlias, getAlias, getAll, validateAlias, MAX_LEN,
  markPendingReset, consumePendingReset, cancelPendingReset, clearUserData
};