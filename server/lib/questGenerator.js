const { supabaseAdmin } = require('./supabaseClient');
const { computeQuestXp } = require('./questXp');
const { isActivityScheduledToday } = require('./activityRecurrence');

// Only focus/journal/tasks have a real, measurable "weakness" signal in this app's own data
// (a last-session date, a last-journal date, a completion rate). wellness/growth/social have
// no tracked equivalent, so they're never claimed to be someone's "weakest area" — that would
// be inventing a judgment this app has no data to back. They still appear in the random slots.
const MEASURABLE_CATEGORIES = ['focus', 'journal', 'tasks'];
const ALL_CATEGORIES = ['focus', 'journal', 'tasks', 'wellness', 'growth', 'social'];

const QUEST_TEMPLATES = {
  focus: [
    { title: 'Deep Work Block', description: 'Track 30 minutes of deep work', tier: 1, icon: 'Timer' },
    { title: 'Focus Session', description: 'Complete a full focus session', tier: 2, icon: 'Target' },
    { title: 'Deep Focus', description: 'Track 2 hours of focus time today', tier: 3, icon: 'Brain' },
    { title: 'No Breaks Challenge', description: 'Stay focused for 2+ hours straight, no breaks', tier: 4, icon: 'Zap' },
  ],
  journal: [
    { title: 'Log Your Mood', description: 'Log your mood for the day', tier: 1, icon: 'Smile' },
    { title: 'Journal It', description: 'Write a journal entry', tier: 2, icon: 'BookOpen' },
    { title: 'Look Back', description: "Reflect on yesterday in today's entry", tier: 2, icon: 'History' },
    { title: 'Deep Reflection', description: 'Write 3 journal entries this week', tier: 3, icon: 'PenLine' },
  ],
  tasks: [
    { title: 'Plan Ahead', description: "Plan tomorrow's tasks", tier: 1, icon: 'ListTodo' },
    { title: 'Priority Push', description: 'Finish a high-priority task', tier: 2, icon: 'Flag' },
    { title: 'Task Sweep', description: 'Complete 3 tasks', tier: 2, icon: 'CheckSquare' },
    { title: 'Clear the Backlog', description: 'Clear your overdue task list', tier: 4, icon: 'ListChecks' },
  ],
  wellness: [
    { title: 'Take a Breather', description: 'Take a 15-minute break', tier: 1, icon: 'Coffee' },
    { title: 'Quiet Mind', description: 'Do a 5-minute meditation', tier: 1, icon: 'Wind' },
    { title: 'Move Your Body', description: 'Take a walk outside', tier: 1, icon: 'Footprints' },
    { title: 'Rest Up', description: 'Get 7+ hours of sleep tonight', tier: 2, icon: 'Moon' },
  ],
  growth: [
    { title: 'Read On', description: 'Read for 20 minutes', tier: 1, icon: 'BookMarked' },
    { title: 'Watch & Learn', description: 'Watch an educational video', tier: 1, icon: 'Film' },
    { title: 'Learn Something', description: 'Learn one new thing today', tier: 2, icon: 'GraduationCap' },
    { title: 'Skill Practice', description: 'Practice a skill for 30 minutes', tier: 2, icon: 'Dumbbell' },
  ],
  social: [
    { title: 'Spread Kindness', description: 'Give someone a genuine compliment', tier: 1, icon: 'Heart' },
    { title: 'Reach Out', description: "Message a friend you haven't talked to in a while", tier: 1, icon: 'MessageCircle' },
    { title: 'Real Talk', description: 'Have one meaningful conversation today', tier: 2, icon: 'Users' },
    { title: 'Lend a Hand', description: 'Help someone with something today', tier: 2, icon: 'HandHeart' },
  ],
};

const STRETCH_TEMPLATES = [
  { category: 'focus', title: 'No Breaks Challenge', description: 'Stay focused for 2+ hours straight, no breaks', tier: 4, icon: 'Zap' },
  { category: 'tasks', title: 'Clear the Backlog', description: 'Clear your overdue task list', tier: 4, icon: 'ListChecks' },
  { category: 'growth', title: 'Perfect Day', description: 'Complete every quest today', tier: 5, icon: 'Trophy' },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickTemplate(category, excludeTitles = new Set()) {
  const pool = QUEST_TEMPLATES[category].filter((t) => !excludeTitles.has(t.title));
  const options = pool.length > 0 ? pool : QUEST_TEMPLATES[category];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Pulls the 7-day signals suggestActivity/suggestSpecialQuest already compute individually,
 * in one place, since generateDailyQuests needs all of them together (weakest category AND
 * today's routine AND current streak).
 */
async function gatherSignals(userId) {
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [journalRes, sessionRes, tasksRes, activitiesRes, streakRes] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
    supabaseAdmin.from('time_logs').select('ended_at').eq('user_id', userId).order('ended_at', { ascending: false }).limit(1),
    supabaseAdmin.from('tasks').select('status, created_at').eq('user_id', userId).gte('created_at', sevenDaysAgoIso),
    supabaseAdmin.from('activities').select('id, name, icon, is_archived, recurrence_type, recurrence_days, start_date, end_date').eq('user_id', userId),
    supabaseAdmin.from('streaks').select('current_streak').eq('user_id', userId).maybeSingle(),
  ]);

  const now = Date.now();
  const daysSince = (iso) => (iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : Infinity);

  const daysSinceJournal = daysSince(journalRes.data?.[0]?.created_at);
  const daysSinceSession = daysSince(sessionRes.data?.[0]?.ended_at);

  const weekTasks = tasksRes.data || [];
  const completionRate = weekTasks.length > 0 ? (weekTasks.filter((t) => t.status === 'done').length / weekTasks.length) * 100 : 100;

  const todaysActivities = (activitiesRes.data || []).filter((a) => !a.is_archived && isActivityScheduledToday(a));

  return {
    daysSinceJournal,
    daysSinceSession,
    completionRate,
    currentStreak: streakRes.data?.current_streak ?? 0,
    todaysActivities,
  };
}

function weakestMeasurableCategory(signals) {
  // All three expressed on a comparable "how concerning is this" scale (higher = weaker).
  const scores = {
    focus: signals.daysSinceSession === Infinity ? 10 : Math.min(10, signals.daysSinceSession),
    journal: signals.daysSinceJournal === Infinity ? 10 : Math.min(10, signals.daysSinceJournal),
    tasks: signals.completionRate < 100 ? (100 - signals.completionRate) / 10 : 0,
  };
  return MEASURABLE_CATEGORIES.reduce((worst, cat) => (scores[cat] > scores[worst] ? cat : worst), MEASURABLE_CATEGORIES[0]);
}

function weaknessReason(category, signals) {
  if (category === 'focus') {
    return signals.daysSinceSession === Infinity
      ? "You haven't logged a focus session yet."
      : `It's been ${signals.daysSinceSession} day${signals.daysSinceSession === 1 ? '' : 's'} since your last focus session.`;
  }
  if (category === 'journal') {
    return signals.daysSinceJournal === Infinity
      ? "You haven't written a journal entry yet."
      : `It's been ${signals.daysSinceJournal} day${signals.daysSinceJournal === 1 ? '' : 's'} since your last journal entry.`;
  }
  return `Your task completion rate this week is ${Math.round(signals.completionRate)}%.`;
}

/**
 * Builds 3-5 quests for `dateKey`: one from the weakest measurable category, one from
 * today's routine (if any recurring activity is scheduled today), one stretch goal, and 1-2
 * random from whatever categories are left — then inserts them all as is_agentic:true rows.
 * Used by both the `generateDailyQuests` AI tool and POST /api/quests/generate (the "Generate
 * Today's Quests" button) — "auto or manual" per the spec, same underlying function either way.
 */
async function generateDailyQuestsForUser(userId, dateKey) {
  const signals = await gatherSignals(userId);
  const usedCategories = new Set();
  const usedTitles = new Set();
  const picks = [];

  const weakCategory = weakestMeasurableCategory(signals);
  const weakTemplate = pickTemplate(weakCategory, usedTitles);
  picks.push({ ...weakTemplate, category: weakCategory, reason: weaknessReason(weakCategory, signals) });
  usedCategories.add(weakCategory);
  usedTitles.add(weakTemplate.title);

  if (signals.todaysActivities.length > 0) {
    const activity = signals.todaysActivities[Math.floor(Math.random() * signals.todaysActivities.length)];
    picks.push({
      title: `Do ${activity.name}`,
      description: `${activity.name} is on your routine for today`,
      tier: 1,
      icon: activity.icon || 'Repeat',
      category: 'focus',
      reason: "It's part of your recurring routine today.",
    });
    usedCategories.add('focus');
  }

  const stretchOptions = shuffle(STRETCH_TEMPLATES.filter((s) => !usedCategories.has(s.category)));
  const stretch = stretchOptions[0] || STRETCH_TEMPLATES[0];
  picks.push({ ...stretch, reason: 'A bigger challenge to push yourself today.' });
  usedCategories.add(stretch.category);
  usedTitles.add(stretch.title);

  const remainingCategories = shuffle(ALL_CATEGORIES.filter((c) => !usedCategories.has(c)));
  const randomSlots = Math.max(0, Math.min(2, 5 - picks.length));
  for (let i = 0; i < randomSlots && i < remainingCategories.length; i++) {
    const category = remainingCategories[i];
    const template = pickTemplate(category, usedTitles);
    picks.push({ ...template, category, reason: 'A fresh pick to mix up your routine.' });
    usedTitles.add(template.title);
  }

  const rows = picks.slice(0, 5).map((pick) => ({
    user_id: userId,
    title: pick.title,
    description: pick.description,
    icon: pick.icon,
    category: pick.category,
    tier: pick.tier,
    xp: computeQuestXp(pick.tier, 1.0, signals.currentStreak, false),
    date: dateKey,
    is_active: true,
    is_custom: false,
    is_agentic: true,
    generation_reason: pick.reason,
  }));

  const { data, error } = await supabaseAdmin.from('quests').insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
}

/** current/longest streak from the existing `streaks` table (bumped only by quest
 * completion — see quests.js's bumpStreakIfDayComplete, and migration 011's comment on why
 * there's no separate quest_streaks table) plus a weekly completion rate computed fresh from
 * quest history rather than stored, so there's nothing to keep in sync. */
async function getQuestStreakInfo(userId) {
  const sevenDaysAgoKey = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [streakRes, questsRes] = await Promise.all([
    supabaseAdmin.from('streaks').select('current_streak, longest_streak').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('quests').select('date, is_completed').eq('user_id', userId).eq('is_active', true).gte('date', sevenDaysAgoKey),
  ]);

  const byDate = {};
  for (const q of questsRes.data || []) {
    const bucket = byDate[q.date] || { total: 0, completed: 0 };
    bucket.total += 1;
    if (q.is_completed) bucket.completed += 1;
    byDate[q.date] = bucket;
  }
  const days = Object.values(byDate);
  const completeDays = days.filter((d) => d.total > 0 && d.completed === d.total).length;
  const weeklyCompletionRate = days.length > 0 ? Math.round((completeDays / days.length) * 100) : 0;

  return {
    currentStreak: streakRes.data?.current_streak ?? 0,
    longestStreak: streakRes.data?.longest_streak ?? 0,
    weeklyCompletionRate,
  };
}

module.exports = {
  generateDailyQuestsForUser,
  getQuestStreakInfo,
  gatherSignals,
  weakestMeasurableCategory,
  weaknessReason,
  pickTemplate,
  QUEST_TEMPLATES,
  STRETCH_TEMPLATES,
  ALL_CATEGORIES,
  MEASURABLE_CATEGORIES,
};
