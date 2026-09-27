const { supabaseAdmin, initError } = require('../lib/supabaseClient');

// Verifies the Supabase-issued access token from "Authorization: Bearer <token>" and
// attaches { id, email } to req.user. getUser() round-trips to Supabase Auth rather than
// decoding locally, so it stays correct across key rotation and immediately reflects
// revoked/expired sessions.
async function requireAuth(req, res, next) {
  if (!supabaseAdmin) {
    // supabaseClient.js failed to initialize (see its own comment) — every other route
    // using this middleware would otherwise throw a raw "Cannot read properties of null"
    // instead of a real error response.
    return res.status(500).json({
      error: 'Server misconfiguration: Supabase client failed to initialize',
      detail: initError ? initError.message : null,
    });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = { id: data.user.id, email: data.user.email };
  next();
}

module.exports = { requireAuth };
