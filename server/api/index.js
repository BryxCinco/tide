// Vercel's zero-config Node.js runtime auto-detects any file under api/ as a serverless
// function and, for an Express app, wraps the exported app as the request handler — no
// `.listen()`, no explicit handler signature needed. vercel.json's rewrite sends every
// path here; Express's own router (mounted in app.js) still does the actual /api/* routing
// from that single entry point, exactly as it already did locally.
module.exports = require('../app');
