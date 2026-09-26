const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabaseAdmin } = require('./lib/supabaseClient');
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

const app = express();

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
  const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);

  if (error) {
    return res.status(500).json({ status: 'error', supabaseConnected: false, message: error.message });
  }

  res.json({ status: 'ok', supabaseConnected: true });
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

// Runs once per cold-start container on Vercel (this module's top-level code executes once
// and the app instance is reused across warm invocations), same effective "once at
// startup" behavior as the old plain-`node index.js` local server.
ensureAvatarsBucket().catch((err) => console.error('[storage] bootstrap failed:', err.message));

// Exports the configured app itself, not a running server — index.js (local dev) is the
// only place that calls .listen(); api/index.js (Vercel) hands this straight to
// @vercel/node instead, which wraps it as a request handler. A serverless function can't
// bind to a port and listen forever, which is exactly what index.js used to do directly —
// almost certainly the actual cause of the runtime 500, not just the vercel.json warning.
module.exports = app;
