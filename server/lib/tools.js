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
const { isActivityScheduledToday } = require('./activityRecurrence');
const { computeQuestXp, questTierMeta } = require('./questXp');
const { generateDailyQuestsForUser, getQuestStreakInfo, gatherSignals, weakestMeasurableCategory, weaknessReason, pickTemplate, STRETCH_TEMPLATES } = require('./questGenerator');

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
      name: 'suggestTideQuest',
      description:
        'Analyze the user\'s last 7 days (journaling gap, session gap, task completion rate, today\'s routine) and suggest 1-3 Tide\'s Quest options to address the weakest one, each with a category, tier (1=Common..5=Legendary), auto-computed XP, and a reason. Two-step like deleteTask: first call with confirm omitted/false just returns the suggestions — relay them and ask which (if any) to add. Only on a clear yes, call again with confirm:true AND the exact title/description/tier/icon/category for the one chosen, to actually create it.',
      parameters: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true to actually create the quest. Leave false/omitted on the first call.' },
          title: { type: 'string', description: 'Only on confirm:true — the exact title from the chosen suggestion.' },
          description: { type: 'string', description: 'Only on confirm:true — the exact description from the chosen suggestion.' },
          tier: { type: 'number', description: 'Only on confirm:true — the exact tier (1-5) from the chosen suggestion.' },
          icon: { type: 'string', description: 'Only on confirm:true — the exact icon name from the chosen suggestion.' },
          category: { type: 'string', description: 'Only on confirm:true — the exact category from the chosen suggestion.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateDailyQuests',
      description:
        "Generates 3-5 fresh Tide's Quest entries for today — one from the user's weakest tracked area, one from today's routine (if any recurring activity is scheduled), one stretch goal, and 1-2 random picks from other categories — and replaces any non-custom quests already set for today (quests the user added themselves are left alone). Use when the user asks to regenerate/refresh/reroll today's quests, or has none yet today.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getQuestStreak',
      description: "Returns the user's current and longest quest-completion streak and their weekly quest completion rate, for motivating them ('2 days from your next milestone!').",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggestTasks',
      description:
        'Suggest 3-5 concrete tasks the user might want to create, drawn from their overdue backlog, goals/to-dos mentioned in recent journal entries, a neglected activity, and how many tasks they already have open. Each comes with a reason. Use this for "suggest some tasks" / "what should I do this week" style requests. To actually add one, use createTask.',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'How many suggestions to return, 1-5. Defaults to 3.' },
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
      name: 'reflectOnJournal',
      description:
        'Pull a journal entry (and light pattern data from the user\'s recent entries) to reflect on. Use this for "reflect on my journal" / "what patterns do you see" style requests — write the actual empathetic reflection yourself in your reply, using what this tool returns.',
      parameters: {
        type: 'object',
        properties: {
          journalId: { type: 'string', description: 'Specific entry to reflect on. Omit to use the most recent entry.' },
        },
        required: [],
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

  // The model's raw JSON arg isn't guaranteed to be an actual boolean (a weaker tool-calling
  // model can emit the string "false") — `!confirm` alone would treat that truthy string as
  // confirmed and delete on the very first call, skipping the confirmation step entirely.
  const isConfirmed = confirm === true || confirm === 'true';
  if (!isConfirmed) {
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
    supabaseAdmin.from('activities').select('id, name, is_archived, recurrence_type, recurrence_days, start_date, end_date').eq('user_id', userId),
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
  // Scheduled-for-today activities sort first (regardless of staleness — that's the whole
  // point of a routine), then never-done (Infinity), then most-neglected first — shuffled
  // before the final sort so similarly-stale activities don't always come back in the same
  // order.
  const scored = pool
    .map((activity) => {
      const lastDone = lastDoneByActivity[activity.id];
      const daysSince = lastDone ? Math.floor((now - new Date(lastDone).getTime()) / 86400000) : Infinity;
      const scheduledToday = isActivityScheduledToday(activity);
      const reason = scheduledToday
        ? "It's on your routine for today."
        : daysSince === Infinity
          ? "You haven't tried this one yet."
          : daysSince === 0
            ? "You did this today — keep the momentum going."
            : `You haven't done this in ${daysSince} day${daysSince === 1 ? '' : 's'}.`;
      return { activityName: activity.name, reason, daysSince, scheduledToday };
    })
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => b.daysSince - a.daysSince)
    .sort((a, b) => Number(b.scheduledToday) - Number(a.scheduledToday));

  const n = Math.max(1, Math.min(count || 3, pool.length));
  const suggestions = scored.slice(0, n).map(({ activityName, reason }) => ({ activityName, reason }));

  return {
    suggestions,
    message: suggestions.map((s) => `${s.activityName} — ${s.reason}`).join(' / '),
  };
};

// DESTRUCTIVE-ish two-step, same shape as deleteTask: the first call (confirm falsy) only
// analyzes and suggests, touching nothing. The second call (confirm:true) actually inserts —
// and since tool-call/tool-result messages don't persist across separate HTTP requests (see
// deleteTask's own comment on this), the model has to echo back the exact title/description/
// tier/icon/category from the first call rather than this handler remembering what it
// suggested. Reuses questGenerator.js's signal-gathering/templates rather than a third copy
// of the same logic (generateDailyQuestsForUser and the old suggestSpecialQuest both used to
// compute these independently).
const TIDE_QUEST_CATEGORIES = ['focus', 'journal', 'tasks', 'wellness', 'growth', 'social'];

toolHandlers.suggestTideQuest = async ({ userId, confirm, title, description, tier, icon, category }) => {
  // See deleteTask's identical comment — the model's raw JSON arg isn't guaranteed to be an
  // actual boolean.
  const isConfirmed = confirm === true || confirm === 'true';
  if (isConfirmed) {
    if (!title) {
      return { error: 'missing quest details', message: "I need the quest's details to add it — ask me to suggest one again first." };
    }

    const resolvedTier = Number.isInteger(tier) && tier >= 1 && tier <= 5 ? tier : 1;
    // Must be one of the client's fixed QuestCategory values (see client/src/types/quest.ts)
    // — an unrecognized category breaks the quest card's color/label lookup there, so an
    // unexpected value falls back to 'growth' rather than passing through whatever the
    // model sent.
    const resolvedCategory = TIDE_QUEST_CATEGORIES.includes(category) ? category : 'growth';
    const xp = computeQuestXp(resolvedTier, 1.0, 0, false);

    const { data, error } = await supabaseAdmin
      .from('quests')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        xp,
        tier: resolvedTier,
        icon: icon || 'Sparkles',
        category: resolvedCategory,
        date: new Date().toISOString().slice(0, 10),
        is_custom: true,
        is_active: true,
        is_agentic: true,
        generation_reason: description || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { added: true, quest: data, message: `Added "${data.title}" to today's quests (+${data.xp} XP, ${questTierMeta(resolvedTier).name}).` };
  }

  const signals = await gatherSignals(userId);
  const weakCategory = weakestMeasurableCategory(signals);
  const suggestions = [];

  const weakTemplate = pickTemplate(weakCategory);
  suggestions.push({
    ...weakTemplate,
    category: weakCategory,
    xp: computeQuestXp(weakTemplate.tier, 1.0, signals.currentStreak, false),
    reason: weaknessReason(weakCategory, signals),
  });

  // The routine suggestion below is always category 'focus' when it applies — excluded here
  // too so the stretch pick can't duplicate it.
  const hasRoutineToday = signals.todaysActivities.length > 0;
  const stretchOptions = STRETCH_TEMPLATES.filter((s) => s.category !== weakCategory && !(hasRoutineToday && s.category === 'focus'));
  const stretch = stretchOptions[Math.floor(Math.random() * stretchOptions.length)] || STRETCH_TEMPLATES[0];
  suggestions.push({ ...stretch, xp: computeQuestXp(stretch.tier, 1.0, signals.currentStreak, false), reason: 'A bigger challenge to push yourself today.' });

  if (hasRoutineToday) {
    const activity = signals.todaysActivities[Math.floor(Math.random() * signals.todaysActivities.length)];
    suggestions.push({
      title: `Do ${activity.name}`,
      description: `${activity.name} is on your routine for today`,
      tier: 1,
      icon: activity.icon || 'Repeat',
      category: 'focus',
      xp: computeQuestXp(1, 1.0, signals.currentStreak, false),
      reason: "It's part of your recurring routine today.",
    });
  }

  return {
    suggestions,
    message:
      suggestions.map((s) => `"${s.title}" (+${s.xp} XP, ${questTierMeta(s.tier).name}) — ${s.reason}`).join(' / ') +
      " Ask the user which one (if any) they'd like to add; only on a clear yes, call this tool again with confirm:true and the exact title/description/tier/icon/category for the one they picked.",
  };
};

toolHandlers.generateDailyQuests = async ({ userId }) => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const { error: clearError } = await supabaseAdmin.from('quests').delete().eq('user_id', userId).eq('date', dateKey).eq('is_custom', false);
  if (clearError) throw new Error(clearError.message);

  const quests = await generateDailyQuestsForUser(userId, dateKey);
  return { quests, message: `Generated ${quests.length} quests for today: ${quests.map((q) => `"${q.title}" (+${q.xp} XP)`).join(', ')}.` };
};

toolHandlers.getQuestStreak = async ({ userId }) => {
  const info = await getQuestStreakInfo(userId);
  return {
    ...info,
    message: `Current streak: ${info.currentStreak} day${info.currentStreak === 1 ? '' : 's'}. Longest: ${info.longestStreak}. Weekly quest completion rate: ${info.weeklyCompletionRate}%.`,
  };
};

// Matches a sentence containing a first-person goal/intent phrase ("I need to...", "I
// should...") — the loose signal suggestTasks uses to pull candidate tasks out of free-form
// journal prose, since journal_entries has no structured "todo" field of its own.
const GOAL_PHRASE_PATTERN = /\b(i need to|i should|i have to|i want to|i'm going to|i am going to|i plan to|i must)\b\s*/i;

function extractGoalCandidates(content) {
  if (!content) return [];
  const sentences = content
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates = [];
  for (const sentence of sentences) {
    if (!GOAL_PHRASE_PATTERN.test(sentence)) continue;
    let cleaned = sentence.replace(GOAL_PHRASE_PATTERN, '').replace(/[.!?]+$/, '').trim();
    if (!cleaned) continue;
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (cleaned.length > 80) cleaned = `${cleaned.slice(0, 77).trimEnd()}...`;
    candidates.push(cleaned);
  }
  return candidates;
}

toolHandlers.suggestTasks = async ({ userId, count }) => {
  const wantCount = Math.max(1, Math.min(count || 3, 5));

  const [tasksRes, journalRes, activitiesRes, logsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('title, status, due_date').eq('user_id', userId),
    supabaseAdmin.from('journal_entries').select('content, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('activities').select('id, name, is_archived').eq('user_id', userId),
    supabaseAdmin.from('time_logs').select('activity_id, ended_at').eq('user_id', userId),
  ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (journalRes.error) throw new Error(journalRes.error.message);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  const tasks = tasksRes.data || [];
  const existingTitles = new Set(tasks.map((t) => (t.title || '').toLowerCase()));
  const candidates = [];

  // Signal 1: overdue backlog.
  const nowIso = new Date().toISOString();
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < nowIso).length;
  if (overdueCount > 0) {
    candidates.push({
      title: 'Clear your overdue tasks',
      description: `You have ${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} — tackle the oldest first.`,
      priority: 'high',
      reason: `${overdueCount} task(s) are past their due date.`,
    });
  }

  // Signal 2: goals/to-dos mentioned in recent journal entries (at most 2 per entry, so one
  // long entry can't crowd out every other signal).
  for (const entry of journalRes.data || []) {
    const goals = extractGoalCandidates(entry.content).slice(0, 2);
    for (const title of goals) {
      if (existingTitles.has(title.toLowerCase())) continue;
      candidates.push({
        title,
        description: 'You mentioned this in your journal.',
        priority: 'medium',
        reason: `From your journal entry on ${new Date(entry.created_at).toDateString()}.`,
      });
    }
  }

  // Signal 3: the most neglected (or never-tried) active activity.
  const pool = (activitiesRes.data || []).filter((a) => !a.is_archived);
  if (pool.length > 0) {
    const lastDoneByActivity = {};
    for (const log of logsRes.data || []) {
      if (!log.activity_id || !log.ended_at) continue;
      if (!lastDoneByActivity[log.activity_id] || log.ended_at > lastDoneByActivity[log.activity_id]) {
        lastDoneByActivity[log.activity_id] = log.ended_at;
      }
    }
    const now = Date.now();
    const mostNeglected = pool
      .map((activity) => {
        const lastDone = lastDoneByActivity[activity.id];
        const daysSince = lastDone ? Math.floor((now - new Date(lastDone).getTime()) / 86400000) : Infinity;
        return { activity, daysSince };
      })
      .sort((a, b) => b.daysSince - a.daysSince)[0];

    if (mostNeglected && mostNeglected.daysSince > 0) {
      candidates.push({
        title: `Spend time on ${mostNeglected.activity.name}`,
        priority: 'low',
        description:
          mostNeglected.daysSince === Infinity
            ? "You haven't tried this activity yet."
            : `You haven't done this in ${mostNeglected.daysSince} day(s).`,
        reason: mostNeglected.daysSince === Infinity ? 'Never tracked.' : `${mostNeglected.daysSince} days since your last session.`,
      });
    }
  }

  // Signal 4: a growing open-task backlog, even without any single overdue item.
  const openCount = tasks.filter((t) => t.status !== 'done').length;
  if (openCount >= 5) {
    candidates.push({
      title: 'Do a task triage',
      description: `You have ${openCount} open tasks — pick the top 3 to focus on this week.`,
      priority: 'medium',
      reason: `${openCount} tasks are still open.`,
    });
  }

  const suggestions = candidates.slice(0, wantCount);

  return {
    suggestions,
    message: suggestions.length
      ? suggestions.map((s) => `${s.title} — ${s.reason}`).join(' / ')
      : "I don't see enough to go on yet — try logging a session or writing a journal entry first.",
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

// Returns the entry plus light pattern data (dominant mood, recurring tags across the last
// 10 entries) — the actual empathetic reflection is written by the model itself in its next
// reply, guided by the `message` instruction below and the SYSTEM_PROMPT's own reflection
// guidance. Hand-writing canned reflection text here would read as generic; the model has
// the entry's full content to work with and can tailor it, the same way every other "stats"
// tool in this file hands back facts for the model to narrate rather than a finished string.
toolHandlers.reflectOnJournal = async ({ userId, journalId }) => {
  let journalQuery = supabaseAdmin.from('journal_entries').select('*').eq('user_id', userId);
  journalQuery = journalId ? journalQuery.eq('id', journalId) : journalQuery.order('created_at', { ascending: false }).limit(1);

  const { data: entries, error: journalError } = await journalQuery;
  if (journalError) throw new Error(journalError.message);
  const journal = entries?.[0];

  if (!journal) {
    return {
      found: false,
      message: journalId ? "I couldn't find that journal entry." : "You don't have any journal entries yet — want to write one?",
    };
  }

  const { data: recent, error: recentError } = await supabaseAdmin
    .from('journal_entries')
    .select('mood, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) throw new Error(recentError.message);

  const moodCounts = {};
  const tagCounts = {};
  for (const entry of recent || []) {
    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    for (const tag of entry.tags || []) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const recurringTags = Object.entries(tagCounts)
    .filter(([, count]) => count >= 2)
    .map(([tag]) => tag);

  return {
    found: true,
    journal: {
      id: journal.id,
      title: journal.title,
      content: journal.content,
      mood: journal.mood,
      tags: journal.tags,
      createdAt: journal.created_at,
    },
    patterns: { dominantMoodRecently: dominantMood, recurringTags, entriesConsidered: (recent || []).length },
    message:
      "Here is the journal entry and light pattern data from the user's recent entries. Write the reflection yourself: " +
      'acknowledge what they shared empathetically, point out 1-2 patterns (mood or recurring themes — only ones the ' +
      'data actually supports), suggest 1-2 actionable takeaways, and end with a genuine reflective follow-up question. ' +
      "Don't just repeat these fields back as a list.",
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
