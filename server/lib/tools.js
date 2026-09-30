const { supabaseAdmin } = require('./supabaseClient');
const {
  upsertEmbedding,
  buildTaskContent,
  buildJournalContent,
  buildSessionContent,
} = require('./embeddingPipeline');
const { retrieveStats } = require('./ragService');

// Groq (OpenAI-compatible) tool/function-calling schema — see
// https://console.groq.com/docs/tool-use. Each entry's `function.parameters` is a JSON
// Schema object; only `required` fields force the model to supply a value before calling.
const tools = [
  {
    type: 'function',
    function: {
      name: 'createTask',
      description: 'Create a new task for the user to track and complete later.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title of the task.' },
          description: { type: 'string', description: 'Optional extra detail about the task.' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'How urgent the task is. Defaults to medium if not specified.',
          },
          dueDate: {
            type: 'string',
            description: 'Optional ISO 8601 date (e.g. 2026-10-05) the task is due.',
          },
          activityType: {
            type: 'string',
            description: 'Optional category/activity this task belongs to (e.g. "work", "personal").',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'completeTask',
      description:
        "Mark an existing task as done, found by matching its title. Use this when the user says they finished, completed, or are done with something.",
      parameters: {
        type: 'object',
        properties: {
          taskTitle: {
            type: 'string',
            description: 'The task title (or close approximation) to find and mark complete.',
          },
        },
        required: ['taskTitle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listTasks',
      description: "List the user's tasks, optionally filtered by status.",
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['todo', 'in-progress', 'done'],
            description: 'Only list tasks with this status. Omit to list all statuses.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tasks to return. Defaults to 10.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'logMood',
      description: "Record how the user is feeling right now as a mood check-in.",
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            enum: ['terrible', 'bad', 'okay', 'good', 'great'],
            description: "The user's current mood.",
          },
          note: {
            type: 'string',
            description: 'Optional short note about why they feel this way.',
          },
        },
        required: ['mood'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'startTimer',
      description: 'Start tracking a focus session for a given activity.',
      parameters: {
        type: 'object',
        properties: {
          activityName: { type: 'string', description: 'The activity being timed (e.g. "Deep work", "Reading").' },
          durationMinutes: {
            type: 'number',
            description: 'Optional planned session length in minutes. Omit for an open-ended session.',
          },
        },
        required: ['activityName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTodayStats',
      description: "Get the user's productivity stats for today only (focus time, tasks completed, sessions, journal entries).",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWeeklySummary',
      description: "Get the user's productivity summary for the last 7 days (focus time, completed tasks, streak, most productive day).",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// Loose fuzzy matcher for completeTask — no fuzzy-matching library is installed, and pulling
// one in for a single call site wasn't worth it. Exact match scores highest, then
// substring containment either direction, then falls back to word-overlap (Jaccard) so
// "call mom" still matches a task titled "Call mom about the trip".
function normalize(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '');
}

function fuzzyScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size ? intersection.length / union.size : 0;
}

const toolHandlers = {};

toolHandlers.createTask = async ({ userId, title, description, priority, dueDate, activityType }) => {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      user_id: userId,
      title,
      description,
      status: 'todo',
      priority: priority || 'medium',
      due_date: dueDate,
      activity_type: activityType,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  upsertEmbedding({
    userId,
    sourceType: 'task',
    sourceId: data.id,
    content: buildTaskContent(data),
    metadata: { title: data.title, status: data.status, priority: data.priority },
  }).catch((err) => console.error('[tools] createTask embedding failed:', err.message));

  return { task: data, message: `Created task: "${data.title}"` };
};

toolHandlers.completeTask = async ({ userId, taskTitle }) => {
  const { data: openTasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done');

  if (error) throw new Error(error.message);

  let best = null;
  let bestScore = 0;
  for (const task of openTasks || []) {
    const score = fuzzyScore(task.title, taskTitle);
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }

  if (!best || bestScore < 0.3) {
    return { matched: false, message: `I couldn't find an open task matching "${taskTitle}".` };
  }

  const { data, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', best.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  upsertEmbedding({
    userId,
    sourceType: 'task',
    sourceId: data.id,
    content: buildTaskContent(data),
    metadata: { title: data.title, status: data.status, priority: data.priority },
  }).catch((err) => console.error('[tools] completeTask embedding failed:', err.message));

  return { task: data, matched: true, message: `Marked "${data.title}" as done.` };
};

toolHandlers.listTasks = async ({ userId, status, limit }) => {
  let query = supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit || 10);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { tasks: data, count: data.length, message: `Found ${data.length} task(s).` };
};

toolHandlers.logMood = async ({ userId, mood, note }) => {
  const title = 'Mood Check-in';
  const content = note && note.trim() ? note.trim() : `Feeling ${mood} today.`;

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert({
      user_id: userId,
      title,
      content,
      mood,
      tags: ['mood-log'],
      word_count: content.trim().split(/\s+/).length,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  upsertEmbedding({
    userId,
    sourceType: 'journal',
    sourceId: data.id,
    content: buildJournalContent(data),
    metadata: { title: data.title, mood: data.mood },
  }).catch((err) => console.error('[tools] logMood embedding failed:', err.message));

  return { entry: data, message: `Logged your mood as "${mood}".` };
};

// There's no live "running timer" state tracked server-side in this codebase (the frontend's
// timer is client-only Zustand state; POST /api/sessions only ever records a session after
// it ends). This handler can't start or sync a live client timer — it records the intent as
// a time_logs row instead: an open-ended row (duration_seconds: 0, ended_at: null) if no
// duration was given, or a pre-filled row spanning now..now+duration if one was.
toolHandlers.startTimer = async ({ userId, activityName, durationMinutes }) => {
  const startedAt = new Date();
  const hasDuration = typeof durationMinutes === 'number' && durationMinutes > 0;
  const endedAt = hasDuration ? new Date(startedAt.getTime() + durationMinutes * 60000) : null;
  const durationSeconds = hasDuration ? Math.round(durationMinutes * 60) : 0;

  const { data, error } = await supabaseAdmin
    .from('time_logs')
    .insert({
      user_id: userId,
      activity_name: activityName,
      duration_seconds: durationSeconds,
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      notes: 'Started via AI Coach',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  upsertEmbedding({
    userId,
    sourceType: 'session',
    sourceId: data.id,
    content: buildSessionContent(data),
    metadata: { activity_name: data.activity_name, date: data.ended_at || data.started_at },
  }).catch((err) => console.error('[tools] startTimer embedding failed:', err.message));

  return {
    session: data,
    message: hasDuration
      ? `Started a ${durationMinutes}-minute focus session for "${activityName}".`
      : `Started tracking "${activityName}". Let me know when you're done so I can log the duration.`,
  };
};

toolHandlers.getTodayStats = async ({ userId }) => {
  const now = new Date();
  const startOfDayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [sessionsRes, tasksRes, journalRes] = await Promise.all([
    supabaseAdmin.from('time_logs').select('duration_seconds').eq('user_id', userId).gte('ended_at', startOfDayIso),
    supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', startOfDayIso),
    supabaseAdmin
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayIso),
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (journalRes.error) throw new Error(journalRes.error.message);

  const focusTimeTodayMinutes = Math.round(
    (sessionsRes.data || []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 60,
  );

  const stats = {
    focusTimeTodayMinutes,
    sessionsToday: (sessionsRes.data || []).length,
    tasksCompletedToday: tasksRes.count || 0,
    journalEntriesToday: journalRes.count || 0,
  };

  return {
    stats,
    message: `Today: ${focusTimeTodayMinutes}m focus time, ${stats.tasksCompletedToday} task(s) completed.`,
  };
};

toolHandlers.getWeeklySummary = async ({ userId }) => {
  const stats = await retrieveStats(userId, { days: 7 });
  return {
    stats,
    message: `This week: ${stats.focusTimeLast7DaysMinutes}m focus time, ${stats.completedTasks} task(s) completed, current streak ${stats.currentStreak} day(s).`,
  };
};

module.exports = { tools, toolHandlers };
