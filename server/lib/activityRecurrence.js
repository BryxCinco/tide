// Mirrors client/src/utils/activityRecurrence.ts's isActivityScheduledOn — hand-duplicated
// the same way xp.ts/xpService.js already are (client/server are separate projects). Shared
// between tools.js (suggestActivity) and questGenerator.js (the routine-based daily quest)
// so the two don't quietly drift apart.
const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isActivityScheduledToday(activity, today = new Date()) {
  if (!activity.recurrence_type || activity.recurrence_type === 'none') return false;
  const todayKey = today.toISOString().slice(0, 10);
  if (activity.start_date && todayKey < activity.start_date) return false;
  if (activity.end_date && todayKey > activity.end_date) return false;

  switch (activity.recurrence_type) {
    case 'daily':
      return true;
    case 'weekly':
      return new Date(activity.start_date).getDay() === today.getDay();
    case 'monthly':
      return new Date(activity.start_date).getDate() === today.getDate();
    case 'custom':
      return (activity.recurrence_days || []).includes(DAY_CODES[today.getDay()]);
    default:
      return false;
  }
}

module.exports = { isActivityScheduledToday };
