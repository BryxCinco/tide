import type { JournalEntry } from '../types/journal';
import { countWords } from '../utils/formatDate';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function entry(id: string, input: Omit<JournalEntry, 'id' | 'wordCount' | 'updatedAt'>): JournalEntry {
  return { ...input, id, updatedAt: input.createdAt, wordCount: countWords(input.content) };
}

/** 6 seed entries spanning today/yesterday/last week/last month, so search, the mood
 * filter, and the This Week / This Month / Favorites chips all have something to show. */
export function createSeedJournalEntries(): JournalEntry[] {
  return [
    entry('journal_seed_1', {
      title: 'Shipped the timer redesign',
      content:
        "Finally got the circular timer animation feeling right today. Spent the morning tuning the easing curve until the progress ring stopped looking jerky. Small win, but it's the kind of detail that makes the whole app feel more polished.",
      mood: 'great',
      tags: ['Productive', 'Creative'],
      isFavorite: true,
      createdAt: daysAgo(0),
    }),
    entry('journal_seed_2', {
      title: 'Slow start, better finish',
      content:
        'Woke up groggy and almost skipped my morning routine. Pushed through anyway and ended up having a decent focus session in the afternoon. Reminder to myself: showing up matters more than feeling ready.',
      mood: 'okay',
      tags: ['Reflective'],
      isFavorite: false,
      createdAt: daysAgo(1),
    }),
    entry('journal_seed_3', {
      title: 'Learned React Native gesture handling',
      content:
        "Spent a few hours going through the reanimated docs to understand shared values properly. It finally clicked why derived values need to be computed on the UI thread. Feels good to actually understand the mental model instead of copy-pasting examples.",
      mood: 'good',
      tags: ['Learning', 'Productive'],
      isFavorite: true,
      createdAt: daysAgo(3),
    }),
    entry('journal_seed_4', {
      title: 'Rough one',
      content:
        "Nothing really went right today. Missed a deadline, got some tough feedback on a design, and just felt behind all day. Trying to remind myself that one bad day doesn't undo the last two weeks of progress.",
      mood: 'terrible',
      tags: ['Challenging'],
      isFavorite: false,
      createdAt: daysAgo(6),
    }),
    entry('journal_seed_5', {
      title: 'Weekend reset',
      content:
        'Took the whole weekend off from screens. Went for a long walk, cooked a proper meal, and read for a couple hours. Grateful for the quiet — it made coming back to work on Monday feel much easier.',
      mood: 'good',
      tags: ['Peaceful', 'Grateful'],
      isFavorite: false,
      createdAt: daysAgo(10),
    }),
    entry('journal_seed_6', {
      title: 'A tough conversation',
      content:
        "Had to give some difficult feedback to a teammate today. It didn't go as smoothly as I hoped, but I think it needed to be said. Not a good feeling in the moment, but the right thing long-term.",
      mood: 'bad',
      tags: ['Personal', 'Challenging'],
      isFavorite: false,
      createdAt: daysAgo(25),
    }),
  ];
}
