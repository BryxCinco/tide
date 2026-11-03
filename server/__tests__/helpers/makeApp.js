const express = require('express');

// A minimal app around the one router under test. Loading app.js itself would also pull in
// every other route (Groq client, embedding model) and run the storage-bucket bootstrap —
// none of which these tests are about.
function makeApp(mountPath, router) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(mountPath, router);
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message });
  });
  return app;
}

module.exports = { makeApp };
