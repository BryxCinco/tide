# Appendices

## Appendix A: Source Code Overview

TIDE's source code is organized as a two-package monorepo:

```
tide/
├── client/     — Expo/React Native Web frontend (TypeScript)
│   ├── app/              — Expo Router screens (file-system-based routing)
│   ├── src/components/   — Reusable UI and feature components, by domain
│   ├── src/store/        — Zustand state stores, one per domain
│   ├── src/services/     — API client modules (one per backend domain)
│   ├── src/hooks/        — Shared custom React hooks
│   ├── src/i18n/         — Translations (13 languages)
│   └── src/utils/        — Formatting, theming, and other shared utilities
├── server/     — Node.js/Express backend (JavaScript)
│   ├── routes/            — 13 Express route modules, one per domain
│   ├── lib/                — Core business logic (AI, RAG, embeddings, quest generation)
│   └── migrations/        — Versioned, hand-written SQL schema migrations
└── docs/       — This documentation
```

### Table 12: Supported Languages (13)

| Code | Language | Code | Language |
|---|---|---|---|
| `en` | English | `ko` | Korean |
| `fil` | Filipino | `id` | Indonesian |
| `es` | Spanish | `fr` | French |
| `ja` | Japanese | `de` | German |
| `zh` | Chinese | `tr` | Turkish |
| `ar` | Arabic | `it` | Italian |
| `ru` | Russian | | |

## Appendix B: Database Schema (SQL)

The full migration history (`server/migrations/002_*.sql` – `011_*.sql`) is available in
the source repository. The following base tables — `profiles`, `activities`,
`time_logs`, `tasks`, `journal_entries` — predate the migrations directory and are
provisioned directly in the Supabase project; only incremental changes to them (and the
tables introduced after the migrations directory was established) are captured in SQL
migration files. Two representative migrations are reproduced here in full:

### `embeddings` table (RAG vector storage)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embeddings_vector_idx
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS embeddings_user_id_idx ON embeddings(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS embeddings_unique_source
  ON embeddings(user_id, source_type, source_id);

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own embeddings"
  ON embeddings FOR ALL USING (auth.uid() = user_id);
```

### `match_embeddings` function (cosine similarity search)

```sql
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid, source_type text, source_id uuid,
  content text, metadata jsonb, similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id, embeddings.source_type, embeddings.source_id,
    embeddings.content, embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE embeddings.user_id = match_user_id
    AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

This function performs the nearest-neighbor similarity search *inside* the database
engine via `pgvector`'s `<=>` cosine-distance operator, with the `match_user_id` filter
applied as part of the same query — no unfiltered or cross-user data is ever returned to
the application layer, even transiently.

## Appendix C: API Endpoints List

All endpoints below are mounted under the `/api` prefix and require a valid Supabase
session bearer token unless otherwise noted.

| Module | Method & Path | Purpose |
|---|---|---|
| Auth | `POST /api/auth/signup` | Register a new account |
| | `POST /api/auth/login` | Email/password login |
| | `PATCH /api/auth/password` | Set/change password |
| | `POST /api/auth/logout` | End session |
| | `GET /api/auth/me` | Get current user profile |
| | `POST /api/auth/backfill-embeddings` | Trigger one-time embedding backfill for existing data |
| | `DELETE /api/auth/account` | Permanently delete account |
| Activities | `GET /api/activities` | List user's activities |
| | `POST /api/activities` | Create a custom activity |
| | `PATCH /api/activities/:id` | Update an activity |
| | `DELETE /api/activities/:id` | Delete a custom activity |
| Sessions | `GET /api/sessions` | List time-tracking sessions |
| | `POST /api/sessions` | Log a completed session |
| | `DELETE /api/sessions/:id` | Delete a session |
| Tasks | `GET /api/tasks` | List tasks |
| | `POST /api/tasks` | Create a task |
| | `PATCH /api/tasks/:id` | Update/complete a task |
| | `DELETE /api/tasks/:id` | Delete a task |
| Journal | `GET /api/journal-entries` | List journal entries |
| | `POST /api/journal-entries` | Create an entry |
| | `PATCH /api/journal-entries/:id` | Update an entry |
| | `DELETE /api/journal-entries/:id` | Delete an entry |
| Quests | `GET /api/quests` | List today's quests |
| | `POST /api/quests` | Create a custom quest |
| | `PATCH /api/quests/:id` | Update/complete a quest |
| | `DELETE /api/quests/:id` | Delete a custom quest |
| | `GET /api/quests/streak` | Get quest-completion streak |
| | `POST /api/quests/generate` | Regenerate today's daily quests |
| Settings | `GET /api/settings` | Get user preferences |
| | `PATCH /api/settings` | Update preferences |
| Streaks | `GET /api/streaks` | Get usage streak info |
| Levels | `GET /api/levels` | Get XP/level info |
| Profile | `PATCH /api/profile` | Update profile (name, bio, avatar) |
| Insights | `GET /api/insights/summary` | Productivity score + summary stats |
| | `GET /api/insights/range` | Time-series data for a date range |
| | `GET /api/insights/heatmap` | Contribution heatmap data |
| | `GET /api/insights/activity-breakdown` | Per-activity time breakdown |
| Chat (AI Coach) | `POST /api/chat` | Send a message (agentic, tool-calling-enabled) |
| | `POST /api/chat/stream` | Send a message (SSE streaming, text-only) |
| | `POST /api/chat/insights` | Generate AI suggestions for the Insights screen |
| Debug | `GET /api/debug/rag` | *(development only)* inspect raw RAG retrieval output |

## Appendix D: AI Tools List (25 Tools)

The AI Coach's agentic tool set, grouped by domain, as exposed to the LLM via Groq's
function-calling API:

| Category | Tool | Purpose |
|---|---|---|
| Tasks | `createTask` | Create a new task |
| | `listTasks` | List tasks, optionally filtered by status |
| | `listMissedTasks` | List overdue/missed tasks |
| | `updateTask` | Change a task's title, priority, status, or due date |
| | `completeTask` | Mark a task complete |
| | `rescheduleTask` | Move a task to a new due date |
| | `deleteTask` | Delete a task *(two-step confirmation required)* |
| | `suggestTasks` | AI-suggest new tasks based on the user's patterns |
| Mood & Journal | `logMood` | Record a mood check-in |
| | `getMoodHistory` | Retrieve mood history over a time window |
| | `addJournalEntry` | Create a journal entry |
| | `searchJournals` | Semantic/keyword search over past entries |
| | `reflectOnJournal` | Generate an empathetic AI reflection on an entry |
| Time & Stats | `startTimer` | Begin a tracked focus session |
| | `getTodayStats` | Today's productivity stats |
| | `getWeeklySummary` | Last-7-days productivity summary |
| | `getActivityStats` | Per-activity time statistics |
| | `getStreakInfo` | Current/longest usage streak |
| | `suggestActivity` | AI-suggest an activity to focus on |
| | `getLevelInfo` | Current XP and level |
| | `getLeaderboard` | Top-10 anonymized XP leaderboard |
| Tide's Quest | `suggestTideQuest` | Suggest 1–3 custom quest options *(two-step confirmation on acceptance)* |
| | `generateDailyQuests` | Regenerate today's daily quest set |
| | `getQuestStreak` | Quest-completion streak |
| Other | `getWeather` | Current weather for a given (or default) location |

## Appendix E: User Manual

### Getting Started

1. Visit the TIDE web app or install the mobile app, then choose **Sign Up**, **Continue
   with Google**, or **Try Demo** (no account required; data stays on-device only).
2. On first login, the Dashboard presents an overview of your day — tap **+** on any
   widget card to begin logging a focus session, task, or journal entry.

### Tracking Focus Time

1. Open **Timer**, select an activity (or create a custom one via **Activities**), and
   tap **Start**.
2. Pause or stop the session at any time; stopping logs the session to your history.

### Journaling

1. Open **Journal** and tap **New Entry**.
2. Write freely, optionally select a mood and tags, and attach photos.
3. Entries auto-save every few seconds; tap **Save** at any time to save immediately.

### Managing Tasks

1. Open **Tasks** and tap **New** to create a task with a title, priority, and due date.
2. Tap a task's circular indicator to mark it complete; swipe or use the delete action
   to remove a task (a confirmation prompt will appear first).

### Using the AI Coach

1. Open **AI Coach** from the navigation menu.
2. Ask a question about your own data ("How has my mood been this month?") or ask it to
   take an action directly ("Add a task to call the dentist tomorrow").
3. For destructive actions (like deleting a task), the AI Coach will ask you to confirm
   before proceeding.

## Appendix F: Screenshots

*[The student should capture and insert actual application screenshots here,
corresponding to Figures 10–17 listed in the List of Figures. Recommended: capture each
at both a phone-width (e.g., 390px) and desktop-width viewport to also illustrate the
responsive design discussed in Chapter 4.]*

## Appendix G: Test Cases

A representative sample of manual test cases used during the testing phase (Chapter 6):

| Test Case ID | Feature | Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-01 | Registration | Submit the sign-up form with a valid, unused email and password | Account is created and the user is logged in | ✅ Pass |
| TC-02 | Task deletion (confirmation) | Tap delete on a task, without confirming | Task is **not** deleted; a confirmation prompt appears | ✅ Pass |
| TC-03 | Task deletion (confirmed) | Confirm the deletion prompt from TC-02 | Task is deleted | ✅ Pass |
| TC-04 | AI Coach — direct action | Ask the AI Coach to "create a task to buy groceries tomorrow" | A new task titled appropriately, due tomorrow, is created | ✅ Pass |
| TC-05 | AI Coach — RAG grounding | Ask "how has my mood been this month?" after logging several mood check-ins | Response cites the actual logged moods/dates, not generic text | ✅ Pass |
| TC-06 | Row-Level Security | Attempt to query another user's `tasks` row directly via the Supabase client using a different account's session | Request returns zero rows | ✅ Pass |
| TC-07 | Password reset | Request a password reset email, follow the link, set a new password | Login succeeds with the new password; old password no longer works | ✅ Pass |
| TC-08 | Responsive layout | Resize the web app from desktop to phone width | Navigation switches from a persistent sidebar to a hamburger-triggered drawer | ✅ Pass |
| TC-09 | Offline/slow network | Disable network connectivity, then send an AI Coach message | A clear, accurate error message is shown (not a raw technical error) | ✅ Pass |
| TC-10 | Dark mode | Toggle dark mode, then navigate between several screens | No flash of light-mode background color during transitions | ✅ Pass |

*[This is a representative sample; the student should expand this table with the full
set of test cases actually executed, including any that initially failed, to
demonstrate the iterative test-fix-retest cycle described in Chapter 6.]*
