const { rateLimit } = require('express-rate-limit');

// One place for every limit, so tuning them is a one-line change.
//
// Caveat: these use express-rate-limit's default in-memory store. On Vercel each serverless
// instance keeps its own counters and loses them on a cold start, so a client spread across
// instances can exceed these numbers. They still stop a single script hammering a warm
// instance; a strict guarantee needs a shared store (e.g. Redis) or Vercel's own rate limiting.

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

// Same `{ error }` shape as every other API error, so the client's getApiErrorMessage shows it.
function tooMany(message) {
  return (req, res, next, options) => res.status(options.statusCode).json({ error: message });
}

const common = { standardHeaders: 'draft-8', legacyHeaders: false };

/** Every request, per client IP. Registered after cors() so preflights are answered before
 * they're counted, and so a 429 still carries the CORS headers the browser needs to read it. */
const globalLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  handler: tooMany('Too many requests. Please wait a few minutes and try again.'),
});

/** POST /api/auth/login, per client IP. Only failed attempts count (skipSuccessfulRequests),
 * so it throttles password guessing without locking out a classroom of real users signing in
 * from the same Wi-Fi. */
const loginLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many failed sign-in attempts. Please wait 15 minutes and try again.'),
});

/** The AI Coach, per signed-in user (each request costs Groq tokens). Must run after
 * requireAuth, which sets req.user. */
const chatLimiter = rateLimit({
  ...common,
  windowMs: ONE_MINUTE,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  handler: tooMany('TIDE Coach is getting a lot of messages from you right now. Please wait a minute and try again.'),
});

module.exports = { globalLimiter, loginLimiter, chatLimiter };
