const { supabaseAdmin } = require('./supabaseClient');
const {
  upsertEmbedding,
  deleteEmbedding,
  buildTaskContent,
  buildJournalContent,
  buildSessionContent,
} = require('./embeddingPipeline');
const { retrieveStats, retrieveRelevantContext } = require('./ragService');
const { awardXp, xpForLevel } = require('./xpService');

const TASK_COMPLETE_XP = { low: 10, medium: 20, high: 30, critical: 50 };

// WMO weather codes, as returned by Open-Meteo's `current_weather.weathercode` — this is
// their fixed vocabulary (https://open-meteo.com/en/docs), not something TIDE defines.
const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

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
            description: 'Due date as an ISO 8601 date (e.g. 2026-10-05).',
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
      name: 'listMissedTasks',
      description:
        'List the user\'s overdue tasks — not done, with a due date in the past. Use this for "what did I miss?" / "what\'s overdue?" questions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateTask',
      description: "Change a task's title, priority, status, description, or due date, found by matching its current title.",
      parameters: {
        type: 'object',
        properties: {
          taskTitle: { type: 'string', description: 'The task title (or close approximation) to find and update.' },
          updates: {
            type: 'object',
            description: 'Only the fields being changed — omit anything left as-is.',
            properties: {
              title: { type: 'string', description: 'New title.' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
              description: { type: 'string' },
              dueDate: { type: 'string', description: 'ISO 8601 date.' },
            },
          },
        },
        required: ['taskTitle', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteTask',
      description:
        "Permanently delete a task, found by matching its title. DESTRUCTIVE — the first call (without confirm) never deletes anything; it only returns a confirmation question to relay to the user verbatim. Only pass confirm:true after the user has clearly said yes to that exact question.",
      parameters: {
        type: 'object',
        properties: {
          taskTitle: { type: 'string', description: 'The task title (or close approximation) to find and delete.' },
          confirm: {
            type: 'boolean',
            description: 'Must be true to actually delete. Leave false/omitted on the first attempt.',
          },
        },
        required: ['taskTitle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rescheduleTask',
      description: 'Move an existing task to a new single due date, found by matching its title.',
      parameters: {
        type: 'object',
        properties: {
          taskTitle: { type: 'string', description: 'The task title (or close approximation) to find and reschedule.' },
          newDueDate: { type: 'string', description: 'The new due date, ISO 8601 (e.g. 2026-10-12).' },
        },
        required: ['taskTitle', 'newDueDate'],
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
      name: 'getMoodHistory',
      description: "Get the user's logged moods over a recent time window.",
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'How many days back to look. Defaults to 30.' },
        },
        required: [],
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
  {
    type: 'function',
    function: {
      name: 'getActivityStats',
      description:
        "Get time-tracking stats for one activity (total time, session count, average session length, last session date), or — when no activity is named — the user's top 5 activities by total time.",
      parameters: {
        type: 'object',
        properties: {
          activityName: { type: 'string', description: 'Name of the activity to get stats for. Omit for a top-5 overview.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getStreakInfo',
      description: "Get the user's current streak, longest streak ever, and the date they were last active.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getLevelInfo',
      description: "Get the user's current level, total XP, and progress toward the next level.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getLeaderboard',
      description: "Get the top 10 users by total XP (shown anonymously) — for motivational 'how do I compare' questions.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggestActivity',
      description:
        'Suggest a few activities for the user to try, weighted toward ones they haven\'t done recently, each with a short reason. Use this for "suggest something" / "what should I do" / "I\'m bored" style requests.',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'How many suggestions to return. Defaults to 3.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addJournalEntry',
      description: 'Write a new journal entry for the user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title for the entry.' },
          content: { type: 'string', description: 'The entry text.' },
          mood: {
            type: 'string',
            enum: ['terrible', 'bad', 'okay', 'good', 'great'],
            description: 'Optional mood to attach to this entry.',
          },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for this entry.' },
        },
        required: ['title', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchJournals',
      description: 'Semantically search the user\'s past journal entries for ones relevant to a topic or question.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for, e.g. "times I felt stressed about work".' },
          limit: { type: 'number', description: 'Max entries to return. Defaults to 5.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: "Get the current weather for a city. Defaults to Manila if the user doesn't name a location.",
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name, e.g. "Tokyo" or "Cebu City". Defaults to Manila.' },
        },
        required: [],
      },
    },
  },
];

// Loose fuzzy matcher for the *ByTitle tools — no fuzzy-matching library is installed, and
// pulling one in for a handful of call sites wasn't worth it. Exact match scores highest,
// then substring containment either direction, then falls back to word-overlap (Jaccard) so
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

/** Shared by completeTask/updateTask/deleteTask/rescheduleTask — all four find their target
 * the same way (fuzzy title match, scoped to this user), so this factors out the query +
 * scoring instead of repeating it four times. `onlyOpen` restricts to not-yet-done tasks,
 * used by completeTask (a done task can't be completed again); the other three search every
 * status, since editing/deleting/rescheduling a completed task is still meaningful. */
async function findTaskByTitle(userId, title, { onlyOpen = false } = {}) {
  let query = supabaseAdmin.from('tasks').select('*').eq('user_id', userId);
  if (onlyOpen) query = query.neq('status', 'done');

  const { data: tasks, error } = await query;
  if (error) throw new Error(error.message);

  let best = null;
  let bestScore = 0;
  for (const task of tasks || []) {
    const score = fuzzyScore(task.title, title);
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }

  return bestScore >= 0.3 ? best : null;
}

function embedTaskInBackground(userId, task) {
  upsertEmbedding({
    userId,
    sourceType: 'task',
    sourceId: task.id,
    content: buildTaskContent(task),
    metadata: { title: task.title, status: task.status, priority: task.priority },
  }).catch((err) => console.error('[tools] task embedding failed:', err.message));
}

const toolHandlers = {};

toolHandlers.createTask = async ({ userId, title, description, priority, dueDate, activityType }) => {
  // The tool schema marks `title` required, but that's a hint to the model, not an
  // API-enforced guarantee — unlike the REST route (routes/tasks.js), this handler talks
  // to Supabase directly, bypassing that route's own `if (!title)` check entirely. Without
  // this, an empty/missing title would either insert a blank-titled task or surface a raw
  // Postgres NOT NULL error instead of something the model can react to sensibly.
  if (!title || !title.trim()) {
    return { error: 'title is required', message: "I need a title to create that task — what should I call it?" };
  }

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

  embedTaskInBackground(userId, data);

  const dateNote = dueDate ? ` (due ${dueDate})` : '';
  return { task: data, message: `Created task: "${data.title}"${dateNote}` };
};

toolHandlers.completeTask = async ({ userId, taskTitle }) => {
  const match = await findTaskByTitle(userId, taskTitle, { onlyOpen: true });
  if (!match) {
    return { matched: false, message: `I couldn't find an open task matching "${taskTitle}".` };
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', match.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  embedTaskInBackground(userId, data);
  // findTaskByTitle's onlyOpen:true guarantees this was a not-done -> done transition, so
  // no extra guard is needed here (unlike updateTask below).
  await awardXp(userId, TASK_COMPLETE_XP[data.priority] || TASK_COMPLETE_XP.medium, 'task completed via AI').catch((err) =>
    console.error('[tools] completeTask XP award failed:', err.message),
  );

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

toolHandlers.listMissedTasks = async ({ userId }) => {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done')
    .lt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);

  const message = data.length === 0 ? "You haven't missed anything — nice." : `You've missed ${data.length} task(s).`;
  return { tasks: data, count: data.length, message };
};

toolHandlers.updateTask = async ({ userId, taskTitle, updates = {} }) => {
  const match = await findTaskByTitle(userId, taskTitle);
  if (!match) {
    return { matched: false, message: `I couldn't find a task matching "${taskTitle}".` };
  }

  const patch = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    patch.completed_at = updates.status === 'done' ? new Date().toISOString() : null;
  }

  const { data, error } = await supabaseAdmin.from('tasks').update(patch).eq('id', match.id).eq('user_id', userId).select().single();
  if (error) throw new Error(error.message);

  embedTaskInBackground(userId, data);

  // match (fetched before the patch) carries the pre-update status — only award XP on the
  // not-done -> done transition, not on every edit of an already-done task.
  if (patch.status === 'done' && match.status !== 'done') {
    await awardXp(userId, TASK_COMPLETE_XP[data.priority] || TASK_COMPLETE_XP.medium, 'task completed via AI').catch((err) =>
      console.error('[tools] updateTask XP award failed:', err.message),
    );
  }

  return { task: data, message: `Updated "${data.title}".` };
};

// DESTRUCTIVE — see the tool schema's own description. The first call (confirm falsy) never
// touches the database; it only looks the task up and hands back a confirmation question for
// the model to relay verbatim. NOTE on why this is a `confirm` boolean rather than the
// "confirmation_token" the spec described: tool-call/tool-result messages only exist inside
// one HTTP request's message array (see generateWithTools's `rounds` loop in llmService.js) —
// chatStore.ts only ever persists the final assistant `content` string as chat history, never
// the intermediate tool call/result. A token minted on the first call would never be visible
// to the model on the user's *next* message (a separate request), so it could never echo it
// back. `confirm: true` sidesteps that entirely: the model just re-calls the same tool once
// the user's own next message plainly says yes (per the system prompt's instruction on this).
toolHandlers.deleteTask = async ({ userId, taskTitle, confirm }) => {
  const match = await findTaskByTitle(userId, taskTitle);
  if (!match) {
    return { matched: false, message: `I couldn't find a task matching "${taskTitle}".` };
  }

  if (!confirm) {
    return {
      needsConfirmation: true,
      task: { id: match.id, title: match.title },
      message: `Are you sure you want to delete "${match.title}"? This cannot be undone.`,
    };
  }

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', match.id).eq('user_id', userId);
  if (error) throw new Error(error.message);

  deleteEmbedding(userId, 'task', match.id).catch((err) => console.error('[tools] deleteTask embedding delete failed:', err.message));

  return { deleted: true, task: { id: match.id, title: match.title }, message: `Deleted "${match.title}".` };
};

toolHandlers.rescheduleTask = async ({ userId, taskTitle, newDueDate }) => {
  const match = await findTaskByTitle(userId, taskTitle);
  if (!match) {
    return { matched: false, message: `I couldn't find a task matching "${taskTitle}".` };
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ due_date: newDueDate })
    .eq('id', match.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  embedTaskInBackground(userId, data);

  return { task: data, message: `Rescheduled "${data.title}" to ${newDueDate}.` };
};

const VALID_MOODS = ['terrible', 'bad', 'okay', 'good', 'great'];

toolHandlers.logMood = async ({ userId, mood, note }) => {
  if (!VALID_MOODS.includes(mood)) {
    return { error: 'invalid mood', message: `Mood has to be one of: ${VALID_MOODS.join(', ')}. Which one fits?` };
  }

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

toolHandlers.getMoodHistory = async ({ userId, days }) => {
  const windowDays = days || 30;
  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .select('mood, created_at, title')
    .eq('user_id', userId)
    .not('mood', 'is', null)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const entries = (data || []).map((row) => ({ mood: row.mood, date: row.created_at, title: row.title }));

  return {
    entries,
    count: entries.length,
    message: entries.length
      ? `Found ${entries.length} mood entr${entries.length === 1 ? 'y' : 'ies'} in the last ${windowDays} days.`
      : `No mood entries logged in the last ${windowDays} days.`,
  };
};

// There's no live "running timer" state tracked server-side in this codebase (the frontend's
// timer is client-only Zustand state; POST /api/sessions only ever records a session after
// it ends). This handler can't start or sync a live client timer — it records the intent as
// a time_logs row instead: an open-ended row (duration_seconds: 0, ended_at: null) if no
// duration was given, or a pre-filled row spanning now..now+duration if one was.
toolHandlers.startTimer = async ({ userId, activityName, durationMinutes }) => {
  if (!activityName || !activityName.trim()) {
    return { error: 'activityName is required', message: 'What activity should I start timing?' };
  }

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

  if (durationSeconds > 0) {
    await awardXp(userId, Math.round(durationSeconds / 60), 'session logged via AI').catch((err) =>
      console.error('[tools] startTimer XP award failed:', err.message),
    );
  }

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

toolHandlers.getActivityStats = async ({ userId, activityName }) => {
  const { data, error } = await supabaseAdmin
    .from('time_logs')
    .select('activity_name, duration_seconds, ended_at')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  const rows = data || [];

  if (activityName) {
    const matching = rows.filter((row) => (row.activity_name || '').toLowerCase() === activityName.toLowerCase());
    if (matching.length === 0) {
      return { found: false, message: `No sessions found for "${activityName}".` };
    }

    const totalSeconds = matching.reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
    const sessionCount = matching.length;
    const lastSessionDate = matching.reduce(
      (latest, row) => (row.ended_at && (!latest || row.ended_at > latest) ? row.ended_at : latest),
      null,
    );

    const totalMinutes = Math.round(totalSeconds / 60);
    return {
      found: true,
      activityName,
      totalMinutes,
      sessionCount,
      averageMinutes: Math.round(totalSeconds / sessionCount / 60),
      lastSessionDate,
      message: `"${activityName}": ${totalMinutes}m total across ${sessionCount} session(s).`,
    };
  }

  const byActivity = {};
  for (const row of rows) {
    const name = row.activity_name || 'Unknown';
    byActivity[name] = (byActivity[name] || 0) + (row.duration_seconds || 0);
  }

  const topActivities = Object.entries(byActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, seconds]) => ({ activityName: name, totalMinutes: Math.round(seconds / 60) }));

  return {
    topActivities,
    message: topActivities.length
      ? `Top activities: ${topActivities.map((a) => `${a.activityName} (${a.totalMinutes}m)`).join(', ')}.`
      : 'No tracked activity time yet.',
  };
};

toolHandlers.getStreakInfo = async ({ userId }) => {
  const { data, error } = await supabaseAdmin
    .from('streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .single();

  // PGRST116 ("no rows") just means this account has no streaks row yet.
  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  const streak = data || { current_streak: 0, longest_streak: 0, last_activity_date: null };

  return {
    currentStreak: streak.current_streak,
    longestStreak: streak.longest_streak,
    lastActivityDate: streak.last_activity_date,
    message: `Current streak: ${streak.current_streak} day(s). Longest ever: ${streak.longest_streak} day(s).`,
  };
};

toolHandlers.suggestActivity = async ({ userId, count }) => {
  const [{ data: activities, error: actError }, { data: logs, error: logError }] = await Promise.all([
    supabaseAdmin.from('activities').select('id, name, is_archived').eq('user_id', userId),
    supabaseAdmin.from('time_logs').select('activity_id, ended_at').eq('user_id', userId),
  ]);
  if (actError) throw new Error(actError.message);
  if (logError) throw new Error(logError.message);

  const pool = (activities || []).filter((a) => !a.is_archived);
  if (pool.length === 0) {
    return { suggestions: [], message: "You don't have any activities set up yet — add one first." };
  }

  const lastDoneByActivity = {};
  for (const log of logs || []) {
    if (!log.activity_id || !log.ended_at) continue;
    if (!lastDoneByActivity[log.activity_id] || log.ended_at > lastDoneByActivity[log.activity_id]) {
      lastDoneByActivity[log.activity_id] = log.ended_at;
    }
  }

  const now = Date.now();
  // Never-done activities sort first (Infinity), then most-neglected first — shuffled before
  // that sort so similarly-stale activities don't always come back in the same order.
  const scored = pool
    .map((activity) => {
      const lastDone = lastDoneByActivity[activity.id];
      const daysSince = lastDone ? Math.floor((now - new Date(lastDone).getTime()) / 86400000) : Infinity;
      const reason =
        daysSince === Infinity
          ? "You haven't tried this one yet."
          : daysSince === 0
            ? "You did this today — keep the momentum going."
            : `You haven't done this in ${daysSince} day${daysSince === 1 ? '' : 's'}.`;
      return { activityName: activity.name, reason, daysSince };
    })
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => b.daysSince - a.daysSince);

  const n = Math.max(1, Math.min(count || 3, pool.length));
  const suggestions = scored.slice(0, n).map(({ activityName, reason }) => ({ activityName, reason }));

  return {
    suggestions,
    message: suggestions.map((s) => `${s.activityName} — ${s.reason}`).join(' / '),
  };
};

toolHandlers.getLevelInfo = async ({ userId }) => {
  const { data, error } = await supabaseAdmin.from('user_levels').select('total_xp, level').eq('user_id', userId).single();

  // PGRST116 = no row yet — same defensive default as xpService.awardXp.
  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  const totalXp = data?.total_xp ?? 0;
  const level = data?.level ?? 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const xpToNext = Math.max(0, ceiling - totalXp);
  const progress = ceiling === floor ? 100 : Math.round(((totalXp - floor) / (ceiling - floor)) * 100);

  return {
    level,
    totalXp,
    xpToNext,
    progress,
    message: `Level ${level}, ${totalXp} total XP — ${xpToNext} XP to level ${level + 1}.`,
  };
};

toolHandlers.getLeaderboard = async () => {
  const { data, error } = await supabaseAdmin.from('user_levels').select('level, total_xp').order('total_xp', { ascending: false }).limit(10);

  if (error) throw new Error(error.message);

  const leaderboard = (data || []).map((row, i) => ({ rank: i + 1, level: row.level, totalXp: row.total_xp }));

  return {
    leaderboard,
    message: leaderboard.length
      ? `Top ${leaderboard.length}: ${leaderboard.map((r) => `#${r.rank} Level ${r.level} (${r.totalXp} XP)`).join(', ')}.`
      : 'No one has earned XP yet.',
  };
};

toolHandlers.addJournalEntry = async ({ userId, title, content, mood, tags }) => {
  if (!title || !title.trim() || !content || !content.trim()) {
    return { error: 'title and content are required', message: 'I need both a title and some content to save a journal entry — what would you like it to say?' };
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert({
      user_id: userId,
      title,
      content,
      mood,
      tags: tags && tags.length ? tags : null,
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
  }).catch((err) => console.error('[tools] addJournalEntry embedding failed:', err.message));

  await awardXp(userId, 15, 'journal entry via AI').catch((err) => console.error('[tools] addJournalEntry XP award failed:', err.message));

  return { entry: data, message: `Added journal entry: "${data.title}"` };
};

toolHandlers.searchJournals = async ({ userId, query, limit }) => {
  const wantCount = limit || 5;
  // Over-fetches across all source types (match_embeddings has no source_type filter) and
  // takes the top journal-only matches locally — simpler than a second RPC variant just for
  // this one filtered case.
  const results = await retrieveRelevantContext(userId, query, { limit: wantCount * 4, threshold: 0.15 });
  const journalResults = results.filter((r) => r.source_type === 'journal').slice(0, wantCount);

  return {
    entries: journalResults.map((r) => ({ id: r.source_id, content: r.content, metadata: r.metadata, similarity: r.similarity })),
    count: journalResults.length,
    message: journalResults.length
      ? `Found ${journalResults.length} journal entr${journalResults.length === 1 ? 'y' : 'ies'} matching "${query}".`
      : `No journal entries found matching "${query}".`,
  };
};

// No API key needed (Open-Meteo is free/open) — two calls: geocode the place name to
// lat/lon, then ask the forecast endpoint for that point's current conditions. Both use
// Node's built-in global `fetch` (Node 18+).
toolHandlers.getWeather = async ({ location }) => {
  const place = location && location.trim() ? location.trim() : 'Manila';

  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`);
  if (!geoRes.ok) throw new Error(`Geocoding request failed (${geoRes.status})`);
  const geoData = await geoRes.json();
  const match = geoData.results?.[0];

  if (!match) {
    return { found: false, message: `I couldn't find a location called "${place}".` };
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current_weather=true&hourly=relative_humidity_2m&timezone=auto`,
  );
  if (!weatherRes.ok) throw new Error(`Weather request failed (${weatherRes.status})`);
  const weatherData = await weatherRes.json();
  const current = weatherData.current_weather;

  if (!current) {
    return { found: false, message: `Couldn't get current weather for ${place} right now.` };
  }

  // relative_humidity_2m comes back as an hourly series, not part of current_weather itself —
  // find the hourly entry whose timestamp matches current_weather.time.
  let humidity = null;
  const hourlyTimes = weatherData.hourly?.time;
  const hourlyHumidity = weatherData.hourly?.relative_humidity_2m;
  if (hourlyTimes && hourlyHumidity) {
    const idx = hourlyTimes.indexOf(current.time);
    if (idx !== -1) humidity = hourlyHumidity[idx];
  }

  const condition = WEATHER_CODES[current.weathercode] || 'Unknown conditions';
  const locationLabel = [match.name, match.admin1, match.country].filter(Boolean).join(', ');

  return {
    location: locationLabel,
    temperature: current.temperature,
    condition,
    humidity,
    windSpeed: current.windspeed,
    message: `${locationLabel}: ${current.temperature}°C, ${condition}${humidity != null ? `, ${humidity}% humidity` : ''}.`,
  };
};

module.exports = { tools, toolHandlers };
