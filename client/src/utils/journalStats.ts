import { toPlainPreview } from './blocks.ts';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Journal header numbers. "Last 7 days" is the same trailing 7×24h window as the list's
 * "Last 7 days" filter (journalStore's isWithinDays); words are counted from the plain text,
 * so block markers like "#" and "- [ ]" don't inflate the total. Pure, for tests.
 */
export function journalStats(
  entries: { createdAt: string; isFavorite: boolean; content: string }[],
  now: Date,
): { entries: number; last7Days: number; favorites: number; words: number } {
  const cutoff = now.getTime() - WEEK_MS;
  let last7Days = 0;
  let favorites = 0;
  let words = 0;
  for (const e of entries) {
    if (new Date(e.createdAt).getTime() >= cutoff) last7Days += 1;
    if (e.isFavorite) favorites += 1;
    const text = toPlainPreview(e.content).trim();
    if (text) words += text.split(/\s+/).length;
  }
  return { entries: entries.length, last7Days, favorites, words };
}
