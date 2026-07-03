require('dotenv').config();

const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const ENDPOINT = process.env.COSMOS_ENDPOINT;
const DATABASE = process.env.COSMOS_DATABASE || 'scores365';
const KEY = process.env.COSMOS_KEY;

let client = null;
let database = null;
let containers = {};

function getClient() {
  if (client) return client;
  if (!ENDPOINT) throw new Error('COSMOS_ENDPOINT no configurado');

  const opts = { endpoint: ENDPOINT, userAgentSuffix: 'BotMundialista/1.0' };
  if (KEY) {
    opts.key = KEY;
  } else if (process.env.AZURE_CLIENT_ID || process.env.IDENTITY_ENDPOINT || process.env.MSI_ENDPOINT) {
    opts.aadCredentials = new DefaultAzureCredential();
  }
  client = new CosmosClient(opts);
  return client;
}

function getDatabase() {
  if (!database) database = getClient().database(DATABASE);
  return database;
}

function getContainer(name) {
  if (!containers[name]) containers[name] = getDatabase().container(name);
  return containers[name];
}

async function queryAll(containerName, querySpec, options = {}) {
  const c = getContainer(containerName);
  const opts = { enableCrossPartitionQuery: true, ...options };
  const { resources } = await c.items.query(querySpec, opts).fetchAll();
  return resources;
}

async function queryOne(containerName, querySpec, options = {}) {
  const c = getContainer(containerName);
  const opts = { enableCrossPartitionQuery: true, ...options };
  const { resources } = await c.items.query(querySpec, opts).fetchAll();
  return resources[0] || null;
}

async function getById(containerName, id, partitionKey) {
  const c = getContainer(containerName);
  try {
    const { resource } = await c.item(id, partitionKey).read();
    return resource;
  } catch (e) {
    if (e.code === 404) return null;
    throw e;
  }
}

async function upsert(containerName, doc, retries = 3) {
  const c = getContainer(containerName);
  const { id, ...rest } = doc;
  const safe = { ...rest, id: id != null ? String(id) : id };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { resource } = await c.items.upsert(safe);
      if (resource && resource.id) return resource;
      if (attempt < retries) {
        const backoff = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      console.error(`[cosmos.upsert ${containerName}] empty response after ${retries} retries for id=${safe.id}`);
      return null;
    } catch (e) {
      if (e.code === 429 || e.statusCode === 429 || (e.message && e.message.includes('429'))) {
        const backoff = Math.min(10000, 1000 * Math.pow(2, attempt));
        console.error(`[cosmos.upsert ${containerName}] throttled (429) id=${safe.id}, retry ${attempt + 1}/${retries} in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      console.error(`[cosmos.upsert ${containerName}] FAIL id=${safe.id}: ${e.code || ''} ${e.message?.substring(0, 200) || e}`);
      throw e;
    }
  }
  return null;
}

async function bulkInsert(containerName, docs, retries = 2) {
  if (!docs || docs.length === 0) return [];
  const c = getContainer(containerName);
  const safeDocs = docs.map((d) => {
    const { id, ...rest } = d;
    return { ...rest, id: id != null ? String(id) : id };
  });

  const toInsert = safeDocs.map((d) => ({ operationType: 'Upsert', resourceBody: d }));
  for (let attempt = 0; attempt <= retries; attempt++) {
    const results = await c.items.bulk(toInsert, { continueOnError: true });
    const failed = results.filter((r) => r.statusCode !== 200 && r.statusCode !== 201);
    if (failed.length === 0) return results;
    const throttled = failed.filter((f) => f.statusCode === 429 || (f.errorMessage || '').includes('429'));
    if (throttled.length > 0 && attempt < retries) {
      const backoff = Math.min(15000, 2000 * Math.pow(2, attempt));
      console.error(`[cosmos.bulkInsert ${containerName}] ${failed.length}/${results.length} throttled, retry ${attempt + 1}/${retries} in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    console.error(`[cosmos.bulkInsert ${containerName}] ${failed.length}/${results.length} failed (final). First errors:`);
    failed.slice(0, 3).forEach((f, i) => {
      console.error(`  ${i}: status=${f.statusCode} code=${f.errorCode} msg=${(f.errorMessage || f.message || '').substring(0, 200)}`);
    });
    return results;
  }
  return [];
}

async function deleteDoc(containerName, id, partitionKey) {
  const c = getContainer(containerName);
  try {
    await c.item(id, partitionKey).delete();
    return true;
  } catch (e) {
    if (e.code === 404) return false;
    throw e;
  }
}

async function count(containerName, querySpec = 'SELECT VALUE COUNT(1) FROM c') {
  const c = getContainer(containerName);
  const { resources } = await c.items.query(querySpec, { enableCrossPartitionQuery: true }).fetchAll();
  return resources[0] || 0;
}

async function health() {
  try {
    const db = getDatabase();
    const { resource } = await db.read();
    return { ok: true, database: resource.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getOrFetch(containerName, id, partitionKey, fetcher, ttlSeconds = 300) {
  const cached = await getById(containerName, id, partitionKey);
  if (cached) {
    if (!cached._fetchedAt) return cached;
    const age = (Date.now() - new Date(cached._fetchedAt).getTime()) / 1000;
    if (age < ttlSeconds) return cached;
  }
  const fresh = await fetcher();
  if (fresh) {
    fresh.id = id;
    if (!fresh[partitionKey.replace('/', '')]) fresh[partitionKey.replace('/', '')] = partitionKeyValue;
    fresh._fetchedAt = new Date().toISOString();
    await upsert(containerName, fresh);
  }
  return fresh;
}

module.exports = {
  ENDPOINT,
  DATABASE,
  getClient,
  getDatabase,
  getContainer,
  queryAll,
  queryOne,
  getById,
  upsert,
  bulkInsert,
  deleteDoc,
  count,
  health,
  getOrFetch,
};