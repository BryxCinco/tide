const { supabaseAdmin } = require('./supabaseClient');

// Mirrors client/src/mocks/mockInsights.ts's MOOD_SCORE/CHART_COLORS and
// client/src/utils/formatDate.ts's WEEKDAY_LABELS/mondayFirstIndex — hand-duplicated the
// same way xpService.js/utils/xp.ts already are, since client and server are separate
// projects with no shared package.
const MOOD_SCORE = { terrible: 1, bad: 2, okay: 3, good: 4, great: 5 };
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CHART_COLORS = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EC4899', '#9CA3AF'];

function mondayFirstIndex(date) {
  return (date.getUTCDay() + 6) % 7;
}

// Buckets every timestamp by the UTC date portion of its stored ISO string (ended_at.slice(0,10))
// rather than converting to any particular user's local timezone — the same simplification
// ragService.js's retrieveStats already makes for mostProductiveDay/topActivity. Not
// introducing a new inconsistency, just extending an existing, already-accepted one.
function dateKeysInRange(days, endKey) {
  const end = new Date(`${endKey}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function windowBounds(days, endKey) {
  const keys = dateKeysInRange(days, endKey);
  return { startIso: `${keys[0]}T00:00:00.000Z`, endIso: `${keys[keys.length - 1]}T23:59:59.999Z`, keys };
}

function previousWindow(days, endKey) {
  const { startIso } = windowBounds(days, endKey);
  const prevEnd = new Date(startIso);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  return windowBounds(days, prevEnd.toISOString().slice(0, 10));
}

function formatHoursMinutes(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function trendPercentOf(current, previous) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Completed tasks (by completed_at's date) and completed quests (by the quest's own day)
 * per date key in the window — the "things accomplished" side of a day, alongside tracked
 * time. */
async function getAccomplishmentsByDate(userId, keys) {
  const startKey = keys[0];
  const endKey = keys[keys.length - 1];
  const [tasksRes, questsRes] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', `${startKey}T00:00:00.000Z`)
      .lte('completed_at', `${endKey}T23:59:59.999Z`),
    supabaseAdmin.from('quests').select('date').eq('user_id', userId).eq('is_completed', true).gte('date', startKey).lte('date', endKey),
  ]);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (questsRes.error) throw new Error(questsRes.error.message);

  const tasks = {};
  const quests = {};
  for (const row of tasksRes.data || []) {
    if (!row.completed_at) continue;
    const key = row.completed_at.slice(0, 10);
    tasks[key] = (tasks[key] || 0) + 1;
  }
  for (const row of questsRes.data || []) {
    if (row.date) quests[row.date] = (quests[row.date] || 0) + 1;
  }
  return { tasks, quests };
}

/** { time: DayTimeEntry[], mood: MoodTrendPoint[] } — one entry per day in [end-days+1, end],
 * zero-filled/null-filled rather than sparse, so chart components never see a short array. */
async function getTimeSeries(userId, days, endKey) {
  const { startIso, endIso, keys } = windowBounds(days, endKey);

  const [sessionsRes, journalRes] = await Promise.all([
    supabaseAdmin.from('time_logs').select('duration_seconds, ended_at').eq('user_id', userId).gte('ended_at', startIso).lte('ended_at', endIso),
    supabaseAdmin
      .from('journal_entries')
      .select('mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true }),
  ]);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (journalRes.error) throw new Error(journalRes.error.message);

  const secondsByDate = {};
  for (const row of sessionsRes.data || []) {
    if (!row.ended_at) continue;
    const key = row.ended_at.slice(0, 10);
    secondsByDate[key] = (secondsByDate[key] || 0) + (row.duration_seconds || 0);
  }

  // Ascending order + plain overwrite means the last (latest) entry on a given day wins —
  // "use the latest mood entry per day".
  const moodByDate = {};
  for (const row of journalRes.data || []) {
    if (!row.mood || !row.created_at) continue;
    moodByDate[row.created_at.slice(0, 10)] = row.mood;
  }

  const time = keys.map((key) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    return {
      label: days <= 7 ? WEEKDAY_LABELS[mondayFirstIndex(date)] : String(date.getUTCDate()),
      date: key,
      seconds: secondsByDate[key] || 0,
    };
  });

  const mood = keys.map((key) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    const m = moodByDate[key] || null;
    return {
      label: days === 7 ? WEEKDAY_LABELS[mondayFirstIndex(date)] : String(date.getUTCDate()),
      date: key,
      score: m ? MOOD_SCORE[m] : null,
      mood: m,
    };
  });

  return { time, mood };
}

/** HeatmapDay[] — a day's level is the higher of its tracked-time level and its
 * accomplishments level (tasks + quests completed), so a day spent finishing tasks and
 * quests without the timer still shows as active. */
async function getHeatmap(userId, days, endKey) {
  const { keys } = windowBounds(days, endKey);
  const [{ time }, done] = await Promise.all([getTimeSeries(userId, days, endKey), getAccomplishmentsByDate(userId, keys)]);
  return time.map(({ date, seconds }) => {
    const hours = seconds / 3600;
    const timeLevel = hours >= 5 ? 4 : hours >= 3.5 ? 3 : hours >= 2 ? 2 : hours > 0 ? 1 : 0;
    const tasks = done.tasks[date] || 0;
    const quests = done.quests[date] || 0;
    const count = tasks + quests;
    const doneLevel = count >= 7 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0;
    return { date, level: Math.max(timeLevel, doneLevel), seconds, tasks, quests };
  });
}

const QUEST_CATEGORY_ORDER = ['focus', 'tasks', 'journal', 'wellness', 'growth', 'social'];

/** Tide's Quests over the window: totals, completion rate, XP earned, perfect days, and
 * per-day, per-category and per-tier breakdowns. Quests are keyed by their own `date` (the
 * user's local day they were issued for). Removed (inactive) quests are left out. */
async function getQuestStats(userId, days, endKey) {
  const { keys } = windowBounds(days, endKey);
  const { data, error } = await supabaseAdmin
    .from('quests')
    .select('date, is_completed, xp, tier, category')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('date', keys[0])
    .lte('date', keys[keys.length - 1]);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const done = rows.filter((q) => q.is_completed);

  const dayMap = {};
  for (const q of rows) {
    const d = dayMap[q.date] || (dayMap[q.date] = { completed: 0, total: 0 });
    d.total += 1;
    if (q.is_completed) d.completed += 1;
  }
  const byDay = keys.map((key) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    return {
      date: key,
      label: days <= 7 ? WEEKDAY_LABELS[mondayFirstIndex(date)] : String(date.getUTCDate()),
      completed: dayMap[key]?.completed || 0,
      total: dayMap[key]?.total || 0,
    };
  });

  const catMap = {};
  for (const q of rows) {
    const c = q.category || 'growth';
    const entry = catMap[c] || (catMap[c] = { category: c, completed: 0, total: 0 });
    entry.total += 1;
    if (q.is_completed) entry.completed += 1;
  }
  const byCategory = Object.values(catMap).sort(
    (a, b) => b.completed - a.completed || QUEST_CATEGORY_ORDER.indexOf(a.category) - QUEST_CATEGORY_ORDER.indexOf(b.category),
  );

  const byTier = [1, 2, 3, 4, 5].map((tier) => ({ tier, completed: done.filter((q) => (q.tier || 1) === tier).length }));
  const perfectDays = byDay.filter((d) => d.total > 0 && d.completed === d.total).length;

  return {
    completed: done.length,
    total: rows.length,
    completionRate: rows.length > 0 ? Math.round((done.length / rows.length) * 100) : 0,
    xpEarned: done.reduce((sum, q) => sum + (q.xp || 0), 0),
    perfectDays,
    byDay,
    byCategory,
    byTier,
  };
}

/** ActivityBreakdownSlice[], sorted busiest-first. trendPercent compares against the
 * immediately preceding equal-length window. recentSessions (up to 5, newest first) backs
 * ActivityHistory's expandable row — previously a seeded-hash synthetic generator. */
async function getActivityBreakdown(userId, days, endKey) {
  const { startIso, endIso } = windowBounds(days, endKey);
  const { startIso: prevStartIso, endIso: prevEndIso } = previousWindow(days, endKey);

  const [curRes, prevRes] = await Promise.all([
    supabaseAdmin
      .from('time_logs')
      .select('activity_id, activity_name, duration_seconds, ended_at')
      .eq('user_id', userId)
      .gte('ended_at', startIso)
      .lte('ended_at', endIso),
    supabaseAdmin.from('time_logs').select('activity_name, duration_seconds').eq('user_id', userId).gte('ended_at', prevStartIso).lte('ended_at', prevEndIso),
  ]);
  if (curRes.error) throw new Error(curRes.error.message);
  if (prevRes.error) throw new Error(prevRes.error.message);

  const byActivity = new Map();
  for (const row of curRes.data || []) {
    const name = row.activity_name || 'Other';
    const entry = byActivity.get(name) || { id: row.activity_id || name, seconds: 0, lastSessionDate: null, sessions: [] };
    entry.seconds += row.duration_seconds || 0;
    const sessionDate = (row.ended_at || '').slice(0, 10);
    if (sessionDate) {
      if (!entry.lastSessionDate || sessionDate > entry.lastSessionDate) entry.lastSessionDate = sessionDate;
      entry.sessions.push({ date: sessionDate, seconds: row.duration_seconds || 0 });
    }
    byActivity.set(name, entry);
  }

  const prevByActivity = {};
  for (const row of prevRes.data || []) {
    const name = row.activity_name || 'Other';
    prevByActivity[name] = (prevByActivity[name] || 0) + (row.duration_seconds || 0);
  }

  return Array.from(byActivity.entries())
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .map(([name, entry], index) => ({
      id: entry.id,
      label: name,
      seconds: entry.seconds,
      color: CHART_COLORS[index % CHART_COLORS.length],
      trendPercent: trendPercentOf(entry.seconds, prevByActivity[name] || 0),
      lastSessionDate: entry.lastSessionDate || endKey,
      recentSessions: entry.sessions.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    }));
}

/** { productivityScore, weeklySummary, totalSeconds, totalTimeTrend } — everything the
 * Productivity Score ring, Tracked Time card, and Weekly Summary card need, computed from
 * one shared fetch of the window's sessions/tasks/journal entries. `productivityScore.overall`
 * covers only the 90% ProductivityScore.tsx doesn't already compute live from questStore
 * (focusTime*0.4 + consistency*0.3 + taskCompletion*0.2) — that component adds the quest
 * bonus itself from real-time data, so it isn't duplicated here.
 */
async function getProductivitySummary(userId, days, endKey) {
  const { startIso, endIso, keys } = windowBounds(days, endKey);
  const { startIso: prevStartIso, endIso: prevEndIso } = previousWindow(days, endKey);

  const [sessionsRes, prevSessionsRes, tasksRes, journalRes, questsRes, done] = await Promise.all([
    supabaseAdmin.from('time_logs').select('duration_seconds, ended_at, activity_name').eq('user_id', userId).gte('ended_at', startIso).lte('ended_at', endIso),
    supabaseAdmin.from('time_logs').select('duration_seconds').eq('user_id', userId).gte('ended_at', prevStartIso).lte('ended_at', prevEndIso),
    // Tasks "relevant to this window" = due within it — lets completion rate reflect a
    // specific period instead of the account's all-time backlog.
    supabaseAdmin.from('tasks').select('status, due_date').eq('user_id', userId).gte('due_date', keys[0]).lte('due_date', keys[keys.length - 1]),
    supabaseAdmin.from('journal_entries').select('mood').eq('user_id', userId).gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('quests').select('is_completed, xp').eq('user_id', userId).eq('is_active', true).gte('date', keys[0]).lte('date', keys[keys.length - 1]),
    getAccomplishmentsByDate(userId, keys),
  ]);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (prevSessionsRes.error) throw new Error(prevSessionsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (journalRes.error) throw new Error(journalRes.error.message);
  if (questsRes.error) throw new Error(questsRes.error.message);

  const sessions = sessionsRes.data || [];
  const totalSeconds = sessions.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
  const prevTotalSeconds = (prevSessionsRes.data || []).reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

  // An active day is any day with tracked time, a completed task, or a completed quest.
  const activeDays = new Set(sessions.filter((r) => r.ended_at).map((r) => r.ended_at.slice(0, 10)));
  for (const key of keys) {
    if (done.tasks[key] || done.quests[key]) activeDays.add(key);
  }
  const daysWithActivity = activeDays.size;
  const consistency = Math.round((daysWithActivity / days) * 100);
  // 2 hours/day target, matching the spec's weighted formula.
  const focusTime = Math.min(100, Math.round((totalSeconds / 60 / (days * 120)) * 100));

  const secondsByWeekday = Array(7).fill(0);
  const secondsByActivity = {};
  for (const row of sessions) {
    if (!row.ended_at) continue;
    const idx = mondayFirstIndex(new Date(`${row.ended_at.slice(0, 10)}T00:00:00.000Z`));
    secondsByWeekday[idx] += row.duration_seconds || 0;
    const name = row.activity_name || 'Other';
    secondsByActivity[name] = (secondsByActivity[name] || 0) + (row.duration_seconds || 0);
  }
  let mostProductiveDay = null;
  let bestWeekdaySeconds = 0;
  secondsByWeekday.forEach((seconds, idx) => {
    if (seconds > bestWeekdaySeconds) {
      bestWeekdaySeconds = seconds;
      mostProductiveDay = WEEKDAY_LABELS_FULL[idx];
    }
  });
  const topActivityEntry = Object.entries(secondsByActivity).sort((a, b) => b[1] - a[1])[0];
  const topActivity = topActivityEntry ? topActivityEntry[0] : null;

  const tasks = tasksRes.data || [];
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const taskCompletion = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const quests = questsRes.data || [];
  const questsCompleted = quests.filter((q) => q.is_completed).length;
  const questCompletion = quests.length > 0 ? Math.round((questsCompleted / quests.length) * 100) : 0;
  const questXp = quests.filter((q) => q.is_completed).reduce((sum, q) => sum + (q.xp || 0), 0);

  const moodCounts = {};
  for (const row of journalRes.data || []) {
    if (!row.mood) continue;
    moodCounts[row.mood] = (moodCounts[row.mood] || 0) + 1;
  }
  const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const mostCommonMood = topMoodEntry ? topMoodEntry[0] : null;

  let totalTimeTrend;
  if (prevTotalSeconds <= 0) {
    totalTimeTrend = totalSeconds > 0 ? 'New' : '0%';
  } else {
    const pct = trendPercentOf(totalSeconds, prevTotalSeconds);
    totalTimeTrend = `${pct >= 0 ? '+' : ''}${pct}%`;
  }

  const overall = Math.min(100, Math.round(focusTime * 0.4 + consistency * 0.3 + taskCompletion * 0.2 + questCompletion * 0.1));

  return {
    productivityScore: { overall, consistency, focusTime, taskCompletion, questCompletion },
    weeklySummary: [
      { id: 'total-hours', label: 'Total Tracked', value: formatHoursMinutes(totalSeconds), icon: 'Clock', tint: 'teal' },
      { id: 'best-day', label: 'Most Productive Day', value: mostProductiveDay || 'No data yet', icon: 'TrendingUp', tint: 'blue' },
      {
        id: 'common-mood',
        label: 'Most Common Mood',
        value: mostCommonMood ? mostCommonMood[0].toUpperCase() + mostCommonMood.slice(1) : 'No data yet',
        icon: 'Smile',
        tint: 'purple',
      },
      { id: 'top-activity', label: 'Top Activity', value: topActivity || 'No data yet', icon: 'Brain', tint: 'teal' },
      { id: 'task-rate', label: 'Task Completion', value: tasks.length > 0 ? `${taskCompletion}%` : 'No data yet', icon: 'CheckSquare', tint: 'muted' },
      { id: 'quests-done', label: 'Quests Completed', value: quests.length > 0 ? `${questsCompleted} of ${quests.length}` : 'No data yet', icon: 'Swords', tint: 'purple' },
      { id: 'quest-xp', label: 'Quest XP Earned', value: questXp > 0 ? `${questXp} XP` : 'No data yet', icon: 'Sparkles', tint: 'blue' },
      { id: 'active-days', label: 'Active Days', value: `${daysWithActivity} of ${days}`, icon: 'Flame', tint: 'teal' },
    ],
    totalSeconds,
    totalTimeTrend,
  };
}

module.exports = { getProductivitySummary, getTimeSeries, getHeatmap, getActivityBreakdown, getQuestStats };
