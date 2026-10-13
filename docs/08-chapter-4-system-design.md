# Chapter 4: System Design

## 4.1 System Overview

TIDE is composed of four user-facing functional domains — **Time** (focus-session
tracking), **Interest** (user-defined and predefined activities), **Diary** (mood-aware
journaling), and task/habit management ("**Entries**", in the broader sense of logged
records of productivity) — unified under a single account and surfaced through a
persistent AI Coach that can read across all four domains at once. A visual Insights
dashboard synthesizes this data into charts and AI-generated suggestions, and a
gamification layer (XP, levels, streaks, and daily quests) is layered on top of the core
tracking features to encourage consistent use.

## 4.2 Use Case Diagram and Description

*[Figure 3: Use Case Diagram — actors: "User" (registered or Demo), "AI Coach" (acts as a
secondary actor that itself triggers use cases such as Create Task or Log Mood on the
User's behalf once invoked), and "System" (background actors: Daily Quest Generator,
Streak Calculator). Primary use cases, grouped by domain, are listed in the table below.]*

### Table — Primary Use Cases by Domain

| Domain | Use Cases |
|---|---|
| Account | Register, Log In (email/password), Log In with Google, Use Demo Mode, Reset Password, Link Demo Account to Real Account, Log Out, Delete Account |
| Time Tracking | Start Timer, Pause/Resume Timer, Stop & Save Session, Select Activity, Create Custom Activity, Edit/Archive/Delete Activity, Reorder Activities, Mark Activity as Favorite |
| Journaling | Create Journal Entry, Select Mood, Add Tags, Attach Photos, Search Journal Entries, Edit Entry, Delete Entry, Request AI Reflection on an Entry |
| Task Management | Create Task, Edit Task, Complete Task, Delete Task (with confirmation), Reschedule Task, Filter/Sort Tasks, View Overdue Tasks |
| Gamification | View XP/Level, View Leaderboard, View Streak Info, Accept Daily Quest (Tide's Quest), View Quest Progress |
| Insights | View Productivity Score, View Mood Trend, View Activity Breakdown, View Contribution Heatmap, View AI-Generated Suggestions |
| AI Coach | Send Chat Message, Receive RAG-Grounded Response, Trigger Agentic Tool Action (e.g., "create a task for tomorrow"), Clear Chat History |
| Settings | Change Theme (Light/Dark), Change Language (13 supported), Change Week-Start Day, Manage Notification Preferences |

## 4.3 Entity Relationship Diagram

*[Figure 4: Entity Relationship Diagram — all ten tables below, each keyed by `user_id`
(a foreign key to Supabase's built-in `auth.users` table) with a one-to-many relationship
from `auth.users` to every table listed except `user_settings`/`user_levels`/`streaks`,
which are one-to-one per user.]*

### Table 5: Database Table Summary

| Table | Purpose | Key Columns (non-exhaustive) |
|---|---|---|
| `profiles` | User's public profile information | `id`, `name`, `email`, `bio`, `avatar_url` |
| `activities` | Predefined and user-created trackable activity categories | `id`, `user_id`, `name`, `icon`, `color`, `category`, `is_favorite`, `is_archived`, `sort_order` |
| `time_logs` | Individual recorded focus sessions | `id`, `user_id`, `activity_id`, `started_at`, `ended_at`, `duration_seconds`, `notes`, `tags` |
| `tasks` | User tasks/to-dos | `id`, `user_id`, `title`, `description`, `status`, `priority`, `due_date` |
| `journal_entries` | Journal entries | `id`, `user_id`, `title`, `content`, `mood`, `tags`, `photo_urls`, `created_at` |
| `quests` | Daily/custom quests ("Tide's Quest") | `id`, `user_id`, `title`, `description`, `tier`, `xp_reward`, `date`, `is_custom`, `completed` |
| `user_settings` | Per-user preferences | `user_id`, `theme`, `language`, `week_starts_on`, notification flags |
| `streaks` | Consecutive-day usage streak tracking | `user_id`, `current_streak`, `longest_streak`, `last_active_date` |
| `embeddings` | Vector embeddings for RAG retrieval (see §4.7) | `id`, `user_id`, `source_type`, `source_id`, `content`, `embedding (vector(384))`, `metadata` |
| `user_levels` | Gamification XP/level state | `user_id`, `xp`, `level` |

Every table above has **Row-Level Security (RLS) enabled**, with a policy restricting all
operations (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) to rows where the table's `user_id` (or,
for `profiles`, `id`) column matches the requesting user's authenticated identity
(`auth.uid()`), as enforced directly by PostgreSQL rather than solely by application-layer
checks. See Appendix B for representative SQL excerpts.

## 4.4 Data Flow Diagram

### Level 0 — Context Diagram

*[Figure 5: A single "TIDE System" process bubble, with data flows to/from two external
entities: "User" (sends login credentials, task/journal/session data, chat messages;
receives UI rendering, confirmations, AI responses) and "Groq LLM API" (receives prompts
+ tool definitions; returns completions + tool-call requests).]*

### Level 1 — Main Processes

*[Figure 6: Decomposes the Level 0 bubble into major processes: 1.0 Authenticate User,
2.0 Manage Time Tracking, 3.0 Manage Journal, 4.0 Manage Tasks, 5.0 Generate Insights,
6.0 Process AI Coach Request, 7.0 Manage Gamification State — each reading from and
writing to the relevant table(s) in the Data Tier described in §4.3.]*

### Level 2 — AI Coach Flow (RAG + Agentic Tools)

*[Figure 7: Decomposes process 6.0 above into its constituent steps: 6.1 Receive User
Message → 6.2 Generate Query Embedding (local model) → 6.3 Similarity Search against
`embeddings` table (pgvector) → 6.4 Assemble Context (retrieved records + recent chat
history + current stats) → 6.5 Call Groq LLM with Context + Tool Definitions → 6.6a (if
no tool call) Return Text Response, or 6.6b (if tool call requested) Execute Tool Handler
→ Write/Read Relevant Table → Return Tool Result to LLM → loop back to 6.5 (capped at 3
rounds) → 6.7 Return Final Response to User.]*

## 4.5 System Architecture Diagram

*[Figure 2 — see Chapter 3, §3.3, for the accompanying description. Reproduced here as
the chapter's canonical architecture figure.]*

## 4.6 UI/UX Design

### Design System — "Tide Light"

TIDE's visual design system is centered on a teal brand color (`#14B8A6`, "Tide Teal")
against a light, near-white base in light mode and a deep near-black navy
(`#0A0E14`) in dark mode, with a complementary purple accent used sparingly for secondary
highlights (e.g., leaderboard/"important member" indicators). Typography uses the Inter
typeface family throughout. Interactive elements follow a consistent elevation and
motion language: primary actions use a soft teal glow shadow that intensifies on
hover/press, modal dialogs animate in with a scale-and-fade transition, and list items
use a spring-based press-scale effect for tactile feedback.

### Responsive Breakpoints

*[Figure 9: Three side-by-side mockup frames — Phone (<768px): bottom-accessible
hamburger-triggered slide-in navigation drawer, single-column stacked layout. Tablet
(768–1024px): persistent icon-only collapsed sidebar rail, two-column layout where
space allows. Desktop (>1024px): persistent full sidebar with labels, multi-column
dashboard grid.]*

The application does not use a single fixed breakpoint but instead a `useResponsive()`
hook classifying the current viewport into `isPhone` / `isTablet` / neither
(desktop), consumed throughout the component tree to conditionally render the
appropriate navigation chrome (a floating hamburger button opening a slide-in
`MobileDrawer` on phone, versus a persistent `Sidebar` — collapsed to icons-only on
tablet, full-width on desktop) and to adjust layout density (e.g., card grid column
count, padding scale).

### Wireframe Descriptions

*[Figures 10–17: screenshots to be inserted per Appendix F. Representative screen
structures, described for reference:]*

- **Login/Register:** Centered card (max-width 400px) containing the TIDE wordmark logo,
  email/password fields, a primary "Sign In"/"Create Account" button, a "Continue with
  Google" secondary button, and a "Try Demo" tertiary action.
- **Dashboard:** A greeting header, a horizontally-scrollable or grid-arranged set of
  widget cards (Today's Tasks, Habit Tracker, Quest Card, Recent Activity, Weekly
  Progress), customizable via a "Customize Dashboard" modal.
- **Timer:** A large circular/numeric time display, activity selector, and
  start/pause/stop controls, with a secondary list of recent sessions below.
- **Journal Editor:** A title field, a large multiline content field, a mood selector row
  (icon-based), an interest-tag picker, and an optional photo attachment grid, with
  silent auto-save every 3 seconds and an explicit "Save" action.
- **AI Coach:** A standard chat interface — a fixed header (title, live
  "Online"/"Thinking..." status, clear-chat action), a scrollable message list with
  right-aligned (user) and left-aligned (assistant, with avatar) bubbles, and a
  bottom-pinned multiline composer with a send button.

## 4.7 AI Architecture

### RAG Pipeline

*[Figure 8: A linear pipeline diagram: User's source records (journal entries, tasks,
sessions, activities, profile) → Content Builder (formats each record type into a
descriptive text string) → Local Embedding Model (`Xenova/all-MiniLM-L6-v2`, 384
dimensions, mean-pooled and normalized) → `embeddings` table (`pgvector`, cosine
similarity index) → [at query time] → Query Embedding → Cosine Similarity Search (top-K
nearest) → Retrieved Context → Injected into LLM System Prompt.]*

Embeddings are generated and upserted incrementally as source records are
created/updated (e.g., saving a journal entry triggers re-embedding of that entry), keyed
by `(user_id, source_type, source_id)` so that an edited record's embedding is updated in
place rather than duplicated. A one-time backfill routine exists to embed a user's full
existing history the first time they engage with the AI Coach.

### Agentic Tool-Calling

The AI Coach exposes **25 distinct tools** to the LLM (see Appendix D for the complete,
categorized list), spanning task management, mood/journal actions, time/statistics
queries, and the daily quest system. The orchestration loop (`generateWithTools` in the
backend) allows up to **three rounds** of tool invocation per user message — the model
may call a tool, receive its result, and decide to call another tool (or respond in text)
based on that result, bounded to prevent runaway loops. Destructive or state-changing
actions follow an explicit **two-step confirmation protocol**: the first tool call
(e.g., `deleteTask` with no `confirm` flag) only returns a confirmation prompt without
performing the action; only a clear affirmative reply from the user on the *next* message
triggers the actual execution, with the tool's required parameters re-supplied by the
model rather than persisted automatically.

### Reliability Measures

To keep the AI Coach's failure modes safe and legible to the end user rather than
exposing raw provider-level errors (see Chapter 6 for the specific defect this addressed),
the backend wraps every LLM call in a bounded retry (two attempts, with a doubling delay,
on HTTP 429/500/502/503 responses specifically) and maps any error that still reaches the
route handler to one of a small set of pre-written, user-appropriate messages rather than
forwarding the provider's own error text.
