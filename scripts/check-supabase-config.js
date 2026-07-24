#!/usr/bin/env node
/**
 * scripts/check-supabase-config.js
 *
 * Diagnóstico rápido que verifica si los env vars de Supabase JS están
 * configurados correctamente. Útil después de desplegar o cuando se
 * sospecha que el wrapper está cayendo a pg.
 *
 * Usage:
 *   node scripts/check-supabase-config.js
 *
 * Salidas:
 *   ✓ Supabase JS HTTP path activated    → supabaseClient.isEnabled() === true
 *   ⚠ Supabase JS not configured, using pg fallback  → solapa con `dbStrategy: "pg-only"`
 *
 * Si la salida es "NOT configured", agregar a Vercel:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<eyJ...>
 *
 * El service role key NO es la anon key — tiene bypass de RLS y acceso completo.
 */

require('dotenv').config();
const { isEnabled } = require('../database/supabaseClient');
const db = require('../database/db');
const { logger } = require('../utils/logger');

const hasUrl = !!process.env.SUPABASE_URL;
const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Supabase JS Configuration Check ---');
console.log('');
console.log(`SUPABASE_URL                   : ${hasUrl ? '✓ set' : '✗ missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY      : ${hasKey ? '✓ set' : '✗ missing'}`);
console.log(`supabaseClient.isEnabled()     : ${isEnabled() ? '✓ yes' : '✗ no'}`);
console.log('');

if (isEnabled()) {
  console.log('✓ Supabase JS HTTP path activated');
  console.log('  → /api/football/health will show dbStrategy: "http+pg-fallback"');
  console.log('  → Most queries go through PostgREST (HTTP, no persistent connection)');
  console.log('  → Advanced queries (CTE, multi-JOIN) still use pg with max=1');
  process.exit(0);
} else {
  console.log('⚠ Supabase JS not configured, using pg fallback');
  console.log('  → db.query() routes to queryViaPg (max=1 connection)');
  console.log('  → db.execAdvanced() also uses pg');
  console.log('');
  console.log('To enable:');
  console.log('  1. Vercel Dashboard → Project Settings → Environment Variables');
  console.log('  2. Add SUPABASE_URL=https://<project>.supabase.co');
  console.log('  3. Add SUPABASE_SERVICE_ROLE_KEY=<eyJ...>');
  console.log('  4. Redeploy for the new variables to take effect');
  process.exit(1);
}
