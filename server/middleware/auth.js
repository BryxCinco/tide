const { supabaseAdmin, initError } = require('../lib/supabaseClient');

// Verifies the Supabase-issued access token from "Authorization: Bearer <token>" and
// attaches { id, email } to req.user. getClaims() checks the signature and expiry locally
// against the project's published signing keys (cached after the first request) when the
// project uses asymmetric JWT keys, and falls back to a getUser() round trip to Supabase
// Auth otherwise — so most requests skip a network hop before any real work starts. An
// expired token still fails here either way.
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

  let claims = null;
  let error = null;
  try {
    // Throws (rather than returning an error) on a token that isn't even well-formed JWT.
    const result = await supabaseAdmin.auth.getClaims(token);
    claims = result.data?.claims ?? null;
    error = result.error;
  } catch (err) {
    error = err;
  }

  if (error || !claims?.sub) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = { id: claims.sub, email: claims.email };
  next();
}

module.exports = { requireAuth };
