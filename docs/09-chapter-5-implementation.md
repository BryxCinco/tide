# Chapter 5: Implementation

## 5.1 Development Phases

The system was implemented across the thirteen phases summarized in Table 3 (Chapter 3).
Phases 1–9 established the frontend application and its full feature set against
client-local/mock data; Phase 10 introduced the real backend and migrated the frontend
onto it; Phase 11 added the AI subsystem; Phase 12 focused on cross-cutting polish
(animation, sound, accessibility); and Phase 13 — the phase this documentation's own
testing chapter draws most heavily from — focused on release-readiness hardening: a
systematic bug audit, critical-bug fixes, EAS native build configuration, and a mobile
responsive-design pass.

## 5.2 Frontend Implementation

The client is a single Expo/TypeScript codebase using **Expo Router**'s
file-system-based routing, including **route groups** — `app/(auth)/` for
unauthenticated screens (login, register, password reset) and `app/(tabs)/` for the
primary authenticated tab screens (Dashboard, Timer, Journal, Insights, Profile) — with
top-level routes (`app/tasks.tsx`, `app/activities.tsx`, `app/chat.tsx`) for screens
reached via navigation rather than the tab bar itself.

State management uses **Zustand**, with one store per domain (`authStore`, `taskStore`,
`journalStore`, `chatStore`, etc.) rather than a single global store, each independently
persisted to device storage where appropriate (e.g., `chatStore` persists conversation
history; `authStore` persists the session token). Forms use **React Hook Form** paired
with **Zod** schema validation, giving both client-side validation and, by sharing the
inferred TypeScript types, compile-time type safety between a form's fields and its
submission handler.

A shared, themed **UI component library** (`src/components/ui/`) — `Button`, `Input`,
`Modal`, `Card`, `Avatar`, `Icon`, `Text`, and others — underlies every screen, ensuring
visual and behavioral consistency (e.g., every `Pressable` across the app shares the same
tap-sound and press-scale feedback via a common `SoundPressable` wrapper) rather than
each screen reimplementing its own controls.

## 5.3 Backend Implementation

The backend is an Express 5 application, deployed as a single Vercel serverless function
(`api/index.js`) that wraps the Express app — Vercel's rewrite configuration
(`vercel.json`) routes every incoming path through this one function, with Express's own
router performing the actual `/api/*` path dispatch internally, exactly as it would under
a traditional long-running Node process.

Thirteen route modules (Table 7, Appendix C) group endpoints by domain (`auth.js`,
`tasks.js`, `journals.js`, `activities.js`, `sessions.js`, `chat.js`, `insights.js`,
`levels.js`, `streaks.js`, `quests.js`, `settings.js`, `profile.js`, plus a
development-only `debugRag.js`). Authentication is enforced by Supabase's own session
verification (`auth.getUser()`), not a separately-signed application JWT, with a shared
Express middleware rejecting any request missing a valid bearer token before it reaches a
route handler.

## 5.4 AI Implementation

### Embedding Generation (Local)

Following a mid-project architectural change documented in Chapter 6, embeddings are
generated **locally**, inside the backend process, using `@xenova/transformers` rather
than a third-party hosted inference API:

```js
// server/lib/embeddingService.js (excerpt)
const MODEL = 'Xenova/all-MiniLM-L6-v2';
let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', MODEL);
    })();
  }
  return extractorPromise;
}

async function embedText(text) {
  if (!text || text.trim().length === 0) return null;
  const extractor = await getExtractor();
  const output = await extractor(text.slice(0, 2000), { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

### RAG Retrieval

```js
// server/lib/ragService.js (excerpt)
async function retrieveRelevantContext(userId, query, options = {}) {
  const limit = options.limit ?? 5;
  const threshold = options.threshold ?? 0.2;

  const queryEmbedding = await embedText(query);
  if (!queryEmbedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
    match_threshold: threshold,
  });

  if (error) return [];
  return data || [];
}
```

The `match_embeddings` function itself is a PostgreSQL function (see Appendix B) that
performs the cosine-similarity nearest-neighbor search directly inside the database via
`pgvector`'s `<=>` distance operator, filtering by `user_id` *inside* the SQL query
itself — a user's embedded data is never fetched and filtered after the fact in
application code, which would momentarily pull another user's data into the server
process even if it were discarded before the response.

### Agentic Tool-Calling Loop

```js
// server/lib/llmService.js (excerpt, simplified)
async function generateWithTools({ userId, userQuery, context, stats, history }) {
  const messages = [ /* system prompt, context, history, userQuery */ ];
  const toolsUsed = [];
  let rounds = 0;

  while (rounds < 3) {
    const response = await createCompletion({ model: MODEL, messages, tools, tool_choice: 'auto' });
    const message = response.choices[0]?.message;
    messages.push(message);

    if (!message.tool_calls?.length) {
      return { content: message.content || '', toolsUsed };
    }

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const handler = toolHandlers[toolCall.function.name];
      const result = await handler({ userId, ...args });
      toolsUsed.push(toolCall.function.name);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
    }
    rounds += 1;
  }
  return { content: 'Something went wrong. Please try again.', toolsUsed };
}
```

### Resilient LLM Calls

```js
// server/lib/llmService.js (excerpt)
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const RETRY_DELAYS_MS = [900, 1800];

async function createCompletion(params) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err) {
      if (!RETRYABLE_STATUS.has(err?.status) || attempt === RETRY_DELAYS_MS.length) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}
```

## 5.5 Database Implementation

The schema is managed as a sequence of versioned, hand-written SQL migration files
(`server/migrations/002_*.sql` through `011_*.sql` at the time of this study; see
Appendix B), applied manually against the Supabase project's SQL Editor rather than
through an automated migration-runner tool. Every table enforces Row-Level Security; a
representative policy, from the `embeddings` table, reads:

```sql
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own embeddings"
  ON embeddings FOR ALL USING (auth.uid() = user_id);
```

## 5.6 Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend (Web) | Vercel | Static export (`expo export --platform web`, `web.output: "static"`), with `client/vercel.json` pinning the build command and output directory, and Open Graph/Twitter meta tags injected via `app/+html.tsx` |
| Backend API | Vercel | Serverless Node.js function; `server/vercel.json` rewrites every path to the single Express entrypoint |
| Database / Auth / Storage | Supabase | Managed PostgreSQL, authentication, and file storage |
| Native Mobile (iOS/Android) | Expo Application Services (EAS) | Cloud-built via `eas build`, independent of the developer's own machine OS |

## 5.7 Representative Code Snippets

Additional representative snippets — the two-step destructive-action confirmation
pattern, the Row-Level Security policy set in full, and the full list of agentic tool
definitions — are provided in Appendix B (database schema) and Appendix D (AI tools
list) rather than repeated here, to avoid duplicating the same material across chapters.
