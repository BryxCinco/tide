# TIDE

**Your personal productivity coach — time tracking, journaling, and tasks, tied together by an AI that actually knows your data.**

TIDE combines focus-session tracking, mood journaling, and task management with an AI Coach that can see your real history (via retrieval-augmented generation) and act on it directly (via tool-calling) — log a mood, create or complete a task, suggest a quest, reflect on a journal entry, or just tell you how your week went.

> **Status:** v1.0.0. See [Known limitations](#known-limitations) for what's still rough around the edges.

## Screenshots

_Add screenshots here — e.g. `docs/screenshots/dashboard.png`, `docs/screenshots/chat.png`, `docs/screenshots/insights.png` — and reference them with `![Dashboard](docs/screenshots/dashboard.png)`._

## Features

- **Time tracking** — start/pause/stop focus sessions against custom or predefined activities, with a weighted "Surprise Me" suggestion for neglected activities
- **Journaling with mood** — mood selector, tags, search, and AI reflection on request
- **Task management with XP** — single-due-date tasks, overdue/due-today badges, and a leveling system (XP for completing tasks, logging sessions, journaling, finishing quests, and streak milestones)
- **Custom activities** — predefined + user-created, with per-activity history
- **Insights & analytics** — productivity score, mood trend, activity breakdown, heatmap, and task stats, all computed from your real tracked data, plus AI-generated suggestions grounded in the same stats
- **AI Coach** — RAG + agentic tool-calling (Groq) across 23 tools: create/update/complete/delete/reschedule tasks, log mood, suggest tasks or a custom quest, reflect on a journal entry, check level/leaderboard, weather, and more
- **13 languages** — en, fil, es, ja, zh, ar, ru, ko, id, fr, de, tr, it
- **Dark mode**, Google sign-in (with optional password setup), and guest mode (local-only, no account)

## Tech stack

**Frontend** — Expo + React Native Web + TypeScript + NativeWind, Zustand for state, React Hook Form + Zod for forms

**Backend** — Node.js + Express + Supabase (Postgres, Auth, Storage), deployed as a Vercel serverless function

**AI** — Groq (`qwen/qwen3.8-27b`) for chat/tool-calling, Hugging Face for embeddings, pgvector (via Supabase) for similarity search

## Live demo

- App: https://tide-rust.vercel.app
- API health check: https://tide-api-rust.vercel.app/api/health

## Setup (local dev)

Requires Node.js and a Supabase project.

```bash
# Backend
cd server
npm install
cp .env.example .env   # fill in real values, see below
node index.js          # http://localhost:5000

# Frontend (separate terminal)
cd client
npm install
cp .env.example .env   # fill in real values, see below
npm run web             # or `npm start` for the Expo dev client / native
```

Run the SQL files in `server/migrations/` against your Supabase project's SQL Editor, in numeric order — they aren't applied automatically.

## Environment variables

**`server/.env`**

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | yes | Supabase service-role key — the backend uses this for nearly every DB operation; never expose it client-side |
| `JWT_SECRET` | yes | Checked for presence at boot; not currently read anywhere else (auth is verified via Supabase's own `auth.getUser()`, not a locally-signed JWT) — kept required in case that changes |
| `GROQ_API_KEY` | yes (for AI Coach) | Groq API key for chat/tool-calling |
| `HUGGINGFACE_API_KEY` | yes (for embeddings/RAG) | Hugging Face API key for generating embeddings |
| `ALLOWED_ORIGINS` | no | Comma-separated extra origins allowed by CORS, beyond the built-in production frontend + localhost dev ports |
| `PORT` | no | Local dev server port (default 5000) |
| `NODE_ENV` | no | Set to `production` on Vercel — also gates `/api/debug` off |

**`client/.env`**

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | yes | Base URL of the Express backend (e.g. `http://localhost:5000` locally, the Vercel API URL in production) |
| `EXPO_PUBLIC_SUPABASE_URL` | yes | Same Supabase project URL — used only by the client-side Supabase instance for Google OAuth |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key, client-side |

## Deployment

- **Frontend**: Vercel, building the Expo web export of `client/`
- **Backend**: Vercel serverless function (`server/api/index.js` wraps the Express app; `server/vercel.json` rewrites all routes through it)
- Environment variables are set in each Vercel project's dashboard, not deployed from a `.env` file — note that a var added in the dashboard only takes effect on deployments created *after* it was saved

## Known limitations

- **Web bundle is ~12MB** (target was <5MB). The JS entry point is ~5.8MB; most of the rest is Inter font files — only 4 of the ~18 bundled weights are actually loaded (`client/app/_layout.tsx`'s `useFonts` call). Switching to the per-weight `@expo-google-fonts/inter/<weight>` subpackages instead of the monolithic package should recover most of this.
- The Dashboard's "Weekly Progress" widget (`client/src/components/dashboard/widgets/WeeklyProgressWidget.tsx`) still reads mock data — separate from the Insights screen (which is now fully real), out of scope for that pass.
- Export Data doesn't include today's timer sessions until the Timer tab has been opened at least once this session (`timerStore` isn't persisted).
- `activities`/`time_logs`/`tasks`/etc. have no migration file for their base schema (it predates this repo's `migrations/` directory) — RLS on those tables should be double-checked directly in the Supabase dashboard rather than assumed from code.
- `client-old/` (a pre-Expo Vite scaffold, ~89MB) is still tracked in the repo; left in place pending a decision on whether to remove it.

## License

Not yet chosen — add one (e.g. MIT) before distributing publicly.
