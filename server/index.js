// Local dev entry point only (`npm start` / `npm run dev`) — Vercel never runs this file;
// it goes through api/index.js instead, which imports the same app.js but never calls
// .listen() (see that file's comment for why that distinction matters).
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
