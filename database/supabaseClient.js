require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

let supabase = null;
let supabaseEnabled = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: {
        headers: { 'x-application-name': 'scorehub' },
      },
    });
    supabaseEnabled = true;
    console.log('[supabaseClient] HTTP client initialized for', SUPABASE_URL);
  } catch (err) {
    console.error('[supabaseClient] init failed:', err.message);
    supabase = null;
    supabaseEnabled = false;
  }
} else {
  console.warn(
    '[supabaseClient] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; ' +
    'HTTP client disabled, falling back to pg pool for everything'
  );
}

function isEnabled() {
  return supabaseEnabled;
}

function getClient() {
  if (!supabaseEnabled) {
    throw new Error(
      'Supabase client not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'
    );
  }
  return supabase;
}

module.exports = { supabase, isEnabled, getClient };
