const { supabaseAdmin } = require('./supabaseClient');
const { embedText } = require('./embeddingService');

const SOURCE_TYPE_LABELS = {
  journal: 'JOURNAL ENTRIES',
  session: 'TIME SESSIONS',
  task: 'TASKS',
  activity: 'ACTIVITIES',
  profile: 'PROFILE',
};

// Fixed order rather than whatever order source types happen to appear in the results —
// reads more naturally to the LLM (and to a human skimming the debug endpoint) than
// similarity-score-shuffled section order.
const SOURCE_TYPE_ORDER = ['journal', 'session', 'task', 'activity', 'profile'];

/**
 * Finds the top-N embeddings (cosine similarity, via the match_embeddings RPC —
 * migrations/005_match_embeddings.sql) most relevant to `query`, scoped to this one user
 * (match_user_id is a filter inside the RPC itself, not applied after the fact — a user's
 * data never leaves the SQL layer for anyone else's query). Returns `[]` — never throws —
 * for "no matches above threshold" and for the RPC call itself failing; both are treated as
 * "nothing relevant was found" from the caller's point of view. embedText() failing (the
 * query itself couldn't be embedded) is the one thing this lets propagate: without a query
 * vector there's no search to run at all, which is a real failure, not an empty result.
 */
async function retrieveRelevantContext(userId, query, options = {}) {
  const limit = options.limit ?? 5;
  // TEMPORARY — lowered from 0.5 while diagnosing the RAG endpoint returning empty results
  // even though the RPC itself, tested directly in the SQL Editor with threshold 0.0,
  // returns 5 rows for this user. 0.5 may simply be too strict for this embedding
  // model/query shape — revisit once real queries are being tuned against real data.
  const threshold = options.threshold ?? 0.2;

  console.log('[ragService] retrieveRelevantContext called:', { userId, query, limit, threshold });

  const queryEmbedding = await embedText(query);
  console.log('[ragService] query embedding length:', queryEmbedding ? queryEmbedding.length : null);
  if (!queryEmbedding) {
    console.log('[ragService] embedText returned null/empty — no search performed.');
    return [];
  }

  const searchStart = Date.now();
  const { data, error } = await supabaseAdmin.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
    match_threshold: threshold,
  });
  const elapsedMs = Date.now() - searchStart;

  if (error) {
    console.error('[ragService] match_embeddings RPC failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  console.log(`[ragService] vector search took ${elapsedMs}ms, ${data ? data.length : 0} results:`);
  for (const row of data || []) {
    console.log(`  - ${row.source_type}/${row.source_id}: similarity=${row.similarity}`);
  }

  return data || [];
}

/** Pulls one field's value out of a `buildXContent()`-shaped string (see
 * embeddingPipeline.js) — a line reading exactly `Label: value`. Used as a fallback for
 * fields upsertEmbedding's own `metadata` doesn't carry (e.g. journals.js's incremental
 * hook only stores {title, mood} in metadata, not date — but buildJournalContent() always
 * puts a full "Date: ..." line in `content` itself, so it's never actually missing, just not
 * duplicated into metadata). */
function extractLine(content, label) {
  if (!content) return null;
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function shortDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(text, max = 60) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function formatJournalLine({ content, metadata }) {
  const date = shortDate(metadata?.date) ?? shortDate(extractLine(content, 'Date'));
  const mood = metadata?.mood ?? extractLine(content, 'Mood');
  const excerpt = truncate(extractLine(content, 'Content'));
  return `- ${date ? `${date}: ` : ''}"${excerpt}"${mood ? ` (mood: ${mood})` : ''}`;
}

function formatSessionLine({ content, metadata }) {
  const date = shortDate(metadata?.date);
  const activityName = metadata?.activity_name ?? extractLine(content, 'Activity') ?? 'Session';
  const durationLine = extractLine(content, 'Duration'); // "N minutes"
  const minutesMatch = durationLine && durationLine.match(/(\d+)/);
  const duration = minutesMatch
    ? (() => {
        const minutes = Number(minutesMatch[1]);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : (durationLine ?? 'unknown duration');
  return `- ${activityName}: ${duration}${date ? ` on ${date}` : ''}`;
}

function formatTaskLine({ content, metadata }) {
  const title = metadata?.title ?? extractLine(content, 'Task') ?? 'Untitled task';
  const priority = metadata?.priority ?? extractLine(content, 'Priority');
  const status = metadata?.status ?? extractLine(content, 'Status');
  const details = [priority ? `${priority} priority` : null, status].filter(Boolean).join(', ');
  return `- "${title}"${details ? ` (${details})` : ''}`;
}

function formatActivityLine({ content, metadata }) {
  const name = metadata?.name ?? extractLine(content, 'Activity') ?? 'Activity';
  const category = metadata?.category ?? extractLine(content, 'Category');
  return `- ${name}${category ? ` (${category})` : ''}`;
}

function formatProfileBlock({ content, metadata }) {
  const name = metadata?.name ?? extractLine(content, 'Name');
  const bio = extractLine(content, 'Bio');
  return [name ? `User: ${name}` : null, bio ? `Bio: ${bio}` : null].filter(Boolean).join('\n');
}

const LINE_FORMATTERS = {
  journal: formatJournalLine,
  session: formatSessionLine,
  task: formatTaskLine,
  activity: formatActivityLine,
};

/**
 * Turns retrieveRelevantContext's flat, similarity-ranked list into the section-grouped
 * prompt text an LLM (or a human reading the debug endpoint) actually wants — one
 * `[SECTION]` per source_type present, in a fixed reading order, each row built primarily
 * from `metadata` (cheap, already-structured) and falling back to parsing `content` only for
 * whatever a given source type's metadata doesn't carry. `profile` is a single key:value
 * block instead of a bulleted list — there's only ever one profile row per user.
 */
function buildContextString(results) {
  if (!results || results.length === 0) return '';

  const grouped = {};
  for (const result of results) {
    (grouped[result.source_type] ??= []).push(result);
  }

  const sections = [];
  for (const type of SOURCE_TYPE_ORDER) {
    const items = grouped[type];
    if (!items || items.length === 0) continue;

    const label = SOURCE_TYPE_LABELS[type] ?? type.toUpperCase();
    const body =
      type === 'profile' ? formatProfileBlock(items[0]) : items.map((item) => LINE_FORMATTERS[type](item)).join('\n');

    sections.push(`[${label}]\n${body}`);
  }

  return sections.join('\n\n');
}

/**
 * Aggregate stats for the AI Coach to reference directly, independent of whatever the
 * similarity search happened to retrieve (e.g. "what's my current streak" shouldn't depend
 * on a streak update ever having been embedded). `totalSessions`/`totalJournalEntries`/
 * `completedTasks` use `count: 'exact', head: true` — a real SQL COUNT(*) pushed to
 * Postgres, no rows fetched. The 7-day/30-day focus totals and the most-productive-day/
 * top-activity breakdowns share a single bounded 30-day fetch (just the 3 columns actually
 * needed) and are summed here in JS rather than via another RPC — for one user's session
 * history this is a small, fixed-size fetch, and adding a second SQL function for this
 * wasn't asked for alongside match_embeddings.
 */
async function retrieveStats(userId, options = {}) {
  const start = Date.now();
  const now = Date.now();
  const sevenDaysAgoIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgoIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [sessions30dRes, sessionsCountRes, journalCountRes, completedTasksCountRes, streakRes] = await Promise.all([
    supabaseAdmin
      .from('time_logs')
      .select('duration_seconds, ended_at, activity_name')
      .eq('user_id', userId)
      .gte('ended_at', thirtyDaysAgoIso),
    supabaseAdmin.from('time_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'done'),
    supabaseAdmin.from('streaks').select('current_streak').eq('user_id', userId).single(),
  ]);

  if (sessions30dRes.error) console.error('[ragService] retrieveStats: 30-day sessions fetch failed:', sessions30dRes.error.message);
  if (sessionsCountRes.error) console.error('[ragService] retrieveStats: session count failed:', sessionsCountRes.error.message);
  if (journalCountRes.error) console.error('[ragService] retrieveStats: journal count failed:', journalCountRes.error.message);
  if (completedTasksCountRes.error) console.error('[ragService] retrieveStats: completed task count failed:', completedTasksCountRes.error.message);
  // PGRST116 ("no rows") just means this account has no streaks row yet — not a real failure.
  if (streakRes.error && streakRes.error.code !== 'PGRST116') {
    console.error('[ragService] retrieveStats: streak fetch failed:', streakRes.error.message);
  }

  const sessions30d = sessions30dRes.data || [];
  const sessions7d = sessions30d.filter((s) => s.ended_at && s.ended_at >= sevenDaysAgoIso);
  const sumSeconds = (rows) => rows.reduce((total, row) => total + (row.duration_seconds || 0), 0);

  const byDate = {};
  const byActivity = {};
  for (const session of sessions30d) {
    const seconds = session.duration_seconds || 0;
    if (session.ended_at) {
      const dateKey = session.ended_at.slice(0, 10); // YYYY-MM-DD
      byDate[dateKey] = (byDate[dateKey] || 0) + seconds;
    }
    const activityName = session.activity_name || 'Unknown';
    byActivity[activityName] = (byActivity[activityName] || 0) + seconds;
  }

  const topEntry = (map) =>
    Object.entries(map).reduce((best, [key, seconds]) => (seconds > best.seconds ? { key, seconds } : best), {
      key: null,
      seconds: 0,
    });

  const mostProductiveDay = topEntry(byDate).key;
  const topActivity = topEntry(byActivity).key;

  console.log(`[ragService] retrieveStats took ${Date.now() - start}ms`);

  return {
    focusTimeLast7DaysMinutes: Math.round(sumSeconds(sessions7d) / 60),
    focusTimeLast30DaysMinutes: Math.round(sumSeconds(sessions30d) / 60),
    totalSessions: sessionsCountRes.count || 0,
    totalJournalEntries: journalCountRes.count || 0,
    completedTasks: completedTasksCountRes.count || 0,
    currentStreak: streakRes.data ? streakRes.data.current_streak : 0,
    mostProductiveDay,
    topActivity,
    // Real per-activity minutes over the last 30 days — was already computed above for
    // topActivity but never exposed. generateInsightSuggestions (llmService.js) uses this
    // as its actual "activity breakdown" input, since the client's Insights screen donut
    // is still mock data (a pre-existing gap, not something to feed into a real AI prompt).
    activityBreakdownMinutes: Object.fromEntries(
      Object.entries(byActivity).map(([name, seconds]) => [name, Math.round(seconds / 60)]),
    ),
  };
}

module.exports = { retrieveRelevantContext, buildContextString, retrieveStats };
