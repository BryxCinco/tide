const { supabaseAdmin } = require('./supabaseClient');
const { embedText } = require('./embeddingService');

const EMBEDDINGS_TABLE = 'embeddings';

function buildJournalContent(journal) {
  const parts = [];
  if (journal.title) parts.push(`Journal: ${journal.title}`);
  if (journal.created_at) parts.push(`Date: ${new Date(journal.created_at).toDateString()}`);
  if (journal.mood) parts.push(`Mood: ${journal.mood}`);
  if (journal.tags && journal.tags.length) parts.push(`Tags: ${journal.tags.join(', ')}`);
  if (journal.content) parts.push(`Content: ${journal.content}`);
  return parts.join('\n');
}

function buildSessionContent(session) {
  const parts = [];
  if (session.activity_name) parts.push(`Activity: ${session.activity_name}`);
  if (session.duration_seconds != null) parts.push(`Duration: ${Math.round(session.duration_seconds / 60)} minutes`);
  const date = session.ended_at || session.started_at;
  if (date) parts.push(`Date: ${new Date(date).toDateString()}`);
  if (session.notes) parts.push(`Notes: ${session.notes}`);
  if (session.tags && session.tags.length) parts.push(`Tags: ${session.tags.join(', ')}`);
  return parts.join('\n');
}

function buildTaskContent(task) {
  const parts = [];
  if (task.title) parts.push(`Task: ${task.title}`);
  if (task.status) parts.push(`Status: ${task.status}`);
  if (task.priority) parts.push(`Priority: ${task.priority}`);
  if (task.due_date) parts.push(`Due: ${new Date(task.due_date).toDateString()}`);
  if (task.description) parts.push(`Description: ${task.description}`);
  return parts.join('\n');
}

function buildActivityContent(activity) {
  const parts = [];
  if (activity.name) parts.push(`Activity: ${activity.name}`);
  if (activity.category) parts.push(`Category: ${activity.category}`);
  return parts.join('\n');
}

function buildProfileContent(profile) {
  const parts = [];
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.bio) parts.push(`Bio: ${profile.bio}`);
  return parts.join('\n');
}

/**
 * Embeds `content` and upserts it into the embeddings table, keyed by
 * (user_id, source_type, source_id) — the same row is updated in place (not duplicated)
 * every time a source record changes, via the unique index migrations/004_embeddings.sql
 * creates and `onConflict` here targets. Swallows every failure (empty content, embedText
 * throwing, the upsert itself erroring) and returns null instead — this runs from request
 * handlers and backfill loops that must not fail the user-facing action (saving a journal
 * entry, say) just because embedding it failed.
 */
async function upsertEmbedding({ userId, sourceType, sourceId, content, metadata }) {
  if (!content || !content.trim()) return null;

  let embedding;
  try {
    embedding = await embedText(content);
  } catch (err) {
    console.error(`[embeddingPipeline] embedText failed for ${sourceType}/${sourceId}:`, err.message);
    return null;
  }
  if (!embedding) return null;

  const { data, error } = await supabaseAdmin
    .from(EMBEDDINGS_TABLE)
    .upsert(
      {
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId,
        content,
        embedding,
        metadata: metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,source_type,source_id' },
    )
    .select()
    .single();

  if (error) {
    console.error(`[embeddingPipeline] upsert failed for ${sourceType}/${sourceId}:`, error.message);
    return null;
  }

  return data;
}

/** Best-effort — logs and swallows rather than throwing, same reasoning as upsertEmbedding:
 * called from a source record's own delete handler, which must succeed regardless of
 * whether its embedding cleanup does. */
async function deleteEmbedding(userId, sourceType, sourceId) {
  const { error } = await supabaseAdmin
    .from(EMBEDDINGS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (error) {
    console.error(`[embeddingPipeline] delete failed for ${sourceType}/${sourceId}:`, error.message);
  }
}

/**
 * Embeds everything a user already has — run once when a user first opts into the AI Coach
 * (or re-run to repair gaps), since upsertEmbedding normally only fires incrementally as
 * records are created/updated (see PART 3's route integration). Each source type's rows are
 * embedded one at a time, sequentially, not in parallel via Promise.all — a user with a lot
 * of history firing dozens of concurrent requests at HuggingFace's free-tier API risks
 * rate-limiting the whole backfill into mostly failures; sequential is slower but reliable.
 * Per-row failures (a single bad journal entry, a transient API error) are already swallowed
 * inside upsertEmbedding, so they just don't count toward that type's total instead of
 * aborting the rest of the backfill.
 */
async function backfillUserEmbeddings(userId) {
  const counts = { profile: 0, journal: 0, session: 0, task: 0, activity: 0 };

  const [profileRes, journalsRes, sessionsRes, tasksRes, activitiesRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
    supabaseAdmin.from('journal_entries').select('*').eq('user_id', userId),
    supabaseAdmin.from('time_logs').select('*').eq('user_id', userId),
    supabaseAdmin.from('tasks').select('*').eq('user_id', userId),
    supabaseAdmin.from('activities').select('*').eq('user_id', userId),
  ]);

  if (profileRes.error) {
    console.error('[embeddingPipeline] profile fetch failed:', profileRes.error.message);
  } else if (profileRes.data) {
    const result = await upsertEmbedding({
      userId,
      sourceType: 'profile',
      sourceId: userId,
      content: buildProfileContent(profileRes.data),
      metadata: { name: profileRes.data.name },
    });
    if (result) counts.profile += 1;
  }

  if (journalsRes.error) {
    console.error('[embeddingPipeline] journals fetch failed:', journalsRes.error.message);
  } else {
    for (const journal of journalsRes.data || []) {
      const result = await upsertEmbedding({
        userId,
        sourceType: 'journal',
        sourceId: journal.id,
        content: buildJournalContent(journal),
        metadata: { title: journal.title, mood: journal.mood, date: journal.created_at },
      });
      if (result) counts.journal += 1;
    }
  }

  if (sessionsRes.error) {
    console.error('[embeddingPipeline] sessions fetch failed:', sessionsRes.error.message);
  } else {
    for (const session of sessionsRes.data || []) {
      const result = await upsertEmbedding({
        userId,
        sourceType: 'session',
        sourceId: session.id,
        content: buildSessionContent(session),
        metadata: { activity_name: session.activity_name, date: session.ended_at || session.started_at },
      });
      if (result) counts.session += 1;
    }
  }

  if (tasksRes.error) {
    console.error('[embeddingPipeline] tasks fetch failed:', tasksRes.error.message);
  } else {
    for (const task of tasksRes.data || []) {
      const result = await upsertEmbedding({
        userId,
        sourceType: 'task',
        sourceId: task.id,
        content: buildTaskContent(task),
        metadata: { title: task.title, status: task.status, priority: task.priority },
      });
      if (result) counts.task += 1;
    }
  }

  if (activitiesRes.error) {
    console.error('[embeddingPipeline] activities fetch failed:', activitiesRes.error.message);
  } else {
    for (const activity of activitiesRes.data || []) {
      const result = await upsertEmbedding({
        userId,
        sourceType: 'activity',
        sourceId: activity.id,
        content: buildActivityContent(activity),
        metadata: { name: activity.name, category: activity.category },
      });
      if (result) counts.activity += 1;
    }
  }

  return counts;
}

module.exports = {
  buildJournalContent,
  buildSessionContent,
  buildTaskContent,
  buildActivityContent,
  buildProfileContent,
  upsertEmbedding,
  deleteEmbedding,
  backfillUserEmbeddings,
};
