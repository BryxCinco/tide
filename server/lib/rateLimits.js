const { rateLimit } = require('express-rate-limit');

// One place for every limit, so tuning them is a one-line change.
//
// Caveat: these use express-rate-limit's default in-memory store. On Vercel each serverless
// instance keeps its own counters and loses them on a cold start, so a client spread across
// instances can exceed these numbers. They still stop a single script hammering a warm
// instance; a strict guarantee needs a shared store (e.g. Redis) or Vercel's own rate limiting.

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

const LIMITS = {
  // Per IP — one school/office Wi-Fi is one IP, and a dashboard load alone is ~5 requests, so
  // this is sized for a room of people using the app at once, not for one person.
  global: { windowMs: FIFTEEN_MINUTES, limit: 1000 },
  login: { windowMs: FIFTEEN_MINUTES, limit: 5 },
  // Per IP, every signup counts — a successful one is exactly the abuse (account spam). 20 an
  // hour still lets a classroom on one Wi-Fi sign up during a demo.
  signup: { windowMs: ONE_HOUR, limit: 20 },
  // Per user, failed attempts only — stops guessing the current password on a left-open session.
  passwordChange: { windowMs: FIFTEEN_MINUTES, limit: 5 },
  chat: { windowMs: ONE_MINUTE, limit: 20 },
  // Per user. DB aggregation only (the AI suggestions are /api/chat/insights, under `chat`);
  // the Insights screen loads 5 of these at once, so this allows ~12 screen loads a minute.
  insights: { windowMs: ONE_MINUTE, limit: 60 },
};

const byUser = (req) => req.user.id;

// Same `{ error }` shape as every other API error, so the client's getApiErrorMessage shows it.
function tooMany(message) {
  return (req, res, next, options) => res.status(options.statusCode).json({ error: message });
}

const common = { standardHeaders: 'draft-8', legacyHeaders: false };

/** Every request, per client IP. Registered after cors() so preflights are answered before
 * they're counted, and so a 429 still carries the CORS headers the browser needs to read it. */
const globalLimiter = rateLimit({
  ...common,
  ...LIMITS.global,
  handler: tooMany('Too many requests. Please wait a few minutes and try again.'),
});

/** POST /api/auth/login, per client IP. Only failed attempts count (skipSuccessfulRequests),
 * so it throttles password guessing without locking out a classroom of real users signing in
 * from the same Wi-Fi. */
const loginLimiter = rateLimit({
  ...common,
  ...LIMITS.login,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many failed sign-in attempts. Please wait 15 minutes and try again.'),
});

/** The AI Coach, per signed-in user (each request costs Groq tokens). Must run after
 * requireAuth, which sets req.user. */
const chatLimiter = rateLimit({
  ...common,
  ...LIMITS.chat,
  keyGenerator: byUser,
  handler: tooMany('TIDE Coach is getting a lot of messages from you right now. Please wait a minute and try again.'),
});

/** POST /api/auth/signup, per client IP. */
const signupLimiter = rateLimit({
  ...common,
  ...LIMITS.signup,
  handler: tooMany('Too many accounts created from this network. Please try again later.'),
});

/** PATCH /api/auth/password, per signed-in user, failed attempts only. Must run after
 * requireAuth. (Forgot-password emails don't come through this server — the client calls
 * Supabase Auth directly — so those are limited in the Supabase dashboard, not here.) */
const passwordChangeLimiter = rateLimit({
  ...common,
  ...LIMITS.passwordChange,
  skipSuccessfulRequests: true,
  keyGenerator: byUser,
  handler: tooMany('Too many incorrect password attempts. Please wait 15 minutes and try again.'),
});

/** /api/insights/*, per signed-in user. Must run after requireAuth. */
const insightsLimiter = rateLimit({
  ...common,
  ...LIMITS.insights,
  keyGenerator: byUser,
  handler: tooMany('Too many requests for your stats right now. Please wait a minute and try again.'),
});

module.exports = { LIMITS, globalLimiter, loginLimiter, signupLimiter, passwordChangeLimiter, chatLimiter, insightsLimiter };
