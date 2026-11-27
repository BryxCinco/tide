export type RecencyGroup = 'Today' | 'This week' | 'Earlier';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Buckets items (already sorted by the caller) into Today / This week (the 7 days before
 * today) / Earlier, using local calendar days. Empty groups are left out. Pure, for tests.
 */
export function groupByRecency<T>(items: T[], getDate: (item: T) => string, now: Date): { group: RecencyGroup; items: T[] }[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 7 * DAY_MS;
  const buckets: Record<RecencyGroup, T[]> = { Today: [], 'This week': [], Earlier: [] };
  for (const item of items) {
    const t = new Date(getDate(item)).getTime();
    buckets[t >= startOfToday ? 'Today' : t >= startOfWeek ? 'This week' : 'Earlier'].push(item);
  }
  return (['Today', 'This week', 'Earlier'] as const).filter((g) => buckets[g].length > 0).map((group) => ({ group, items: buckets[group] }));
}
