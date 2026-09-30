const express = require('express');
const cors = require('cors');
// A no-op on Vercel (no .env file is deployed — real values come from the dashboard's
// Environment Variables, injected straight into process.env before this module even
// loads). Kept only so local dev (`node index.js`) still picks up server/.env.
require('dotenv').config();

const { supabaseAdmin, supabaseAuth, initError } = require('./lib/supabaseClient');
const { ensureAvatarsBucket } = require('./lib/storage');
const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const sessionsRoutes = require('./routes/sessions');
const tasksRoutes = require('./routes/tasks');
const journalsRoutes = require('./routes/journals');
const questsRoutes = require('./routes/quests');
const settingsRoutes = require('./routes/settings');
const streaksRoutes = require('./routes/streaks');
const profileRoutes = require('./routes/profile');
const debugRagRoutes = require('./routes/debugRag');
const chatRoutes = require('./routes/chat');

const app = express();

// Which env vars this app actually needs to function, checked for PRESENCE only — never
// logs or exposes a value, just whether process.env picked it up at all. Vercel gotcha
// this is here to catch: env vars added in the dashboard only apply to deployments created
// AFTER they were saved — an existing deployment that predates adding them keeps running
// without them until you trigger a fresh deploy.
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];

function getEnvStatus() {
  return REQUIRED_ENV_VARS.reduce((status, key) => {
    status[key] = Boolean(process.env[key]);
    return status;
  }, {});
}

// Runs once per cold-start container (this module's top level executes once and the app
// instance is reused across warm invocations) — shows up in Vercel's function logs even
// when every request afterward 500s before producing its own log line.
console.log('[app] Cold start. NODE_ENV =', process.env.NODE_ENV || '(not set)');
console.log('[app] Env var presence:', getEnvStatus());
if (initError) {
  console.error('[app] Supabase client failed to initialize:', initError.message);
}

app.use(cors());
// Default is 100kb — a 2MB avatar/cover photo picked as a base64 data: URI (see
// imageUpload.ts) runs ~2.7MB once encoded, which the default limit was rejecting with a
// 413. profile.js decodes and uploads it to Storage rather than storing the base64 itself,
// but the *incoming* request still has to carry that payload once to reach the server.
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'TIDE Backend is up and running!' });
});

app.get('/api/health', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({
      status: 'error',
      supabaseConnected: false,
      message: initError ? initError.message : 'Supabase client not initialized',
    });
  }

  const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);

  if (error) {
    return res.status(500).json({ status: 'error', supabaseConnected: false, message: error.message });
  }

  res.json({ status: 'ok', supabaseConnected: true });
});

// Temporary diagnostic endpoint — reports whether each required env var is present (never
// its value) and whether the Supabase clients actually initialized. Safe to leave up (no
// secrets ever leave this response), but it's naming your exact env var set to anyone who
// requests it, so consider removing or gating it once the deployment is healthy again.
app.get('/api/debug', (req, res) => {
  res.json({
    envVars: getEnvStatus(),
    nodeEnv: process.env.NODE_ENV || null,
    nodeVersion: process.version,
    supabaseAdminReady: Boolean(supabaseAdmin),
    supabaseAuthReady: Boolean(supabaseAuth),
    supabaseInitError: initError ? initError.message : null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/journal-entries', journalsRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/streaks', streaksRoutes);
app.use('/api/profile', profileRoutes);
// Phase 11.3 debug endpoint — see routes/debugRag.js's own comment.
app.use('/api/debug/rag', debugRagRoutes);
app.use('/api/chat', chatRoutes);

// Runs once per cold-start container on Vercel (this module's top-level code executes once
// and the app instance is reused across warm invocations), same effective "once at
// startup" behavior as the old plain-`node index.js` local server.
ensureAvatarsBucket().catch((err) => console.error('[storage] bootstrap failed:', err.message));

// Catches anything a route handler throws or rejects with (Express 5 forwards async
// errors here automatically, no wrapper needed per route) and turns it into a JSON 500
// instead of Express's default HTML error page — the difference between a debuggable
// response and another opaque failure. Must be registered last and take all 4 args
// (Express only treats a 4-arg function as an error handler).
app.use((err, req, res, next) => {
  console.error('[app] Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Exports the configured app itself, not a running server — index.js (local dev) is the
// only place that calls .listen(); api/index.js (Vercel) hands this straight to
// @vercel/node instead, which wraps it as a request handler. A serverless function can't
// bind to a port and listen forever, which is exactly what index.js used to do directly —
// almost certainly the actual cause of the runtime 500, not just the vercel.json warning.
module.exports = app;
