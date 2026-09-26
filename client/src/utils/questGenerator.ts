import type { Quest, QuestCategory } from '../types/quest';

interface QuestTemplate {
  title: string;
  description: string;
  icon: string;
  category: QuestCategory;
  xp: number;
}

/** The 10 quest ideas from the spec, each turned into a short title + the original text as
 * the description (shown together on the card: title first, description as the smaller
 * supporting line — see DailyQuestCard.tsx). */
const QUEST_POOL: QuestTemplate[] = [
  { title: 'Deep Focus', description: 'Track 2 hours of focus time today', icon: 'Timer', category: 'focus', xp: 30 },
  { title: 'Journal It', description: 'Write a journal entry', icon: 'BookOpen', category: 'journal', xp: 20 },
  { title: 'Task Sweep', description: 'Complete 3 tasks', icon: 'CheckSquare', category: 'tasks', xp: 25 },
  { title: 'Take a Breather', description: 'Take a 10-minute break', icon: 'Coffee', category: 'wellness', xp: 10 },
  { title: 'Something New', description: 'Try a new activity', icon: 'Sparkles', category: 'growth', xp: 15 },
  { title: 'Check In', description: 'Log your mood for the day', icon: 'Smile', category: 'wellness', xp: 10 },
  { title: 'Look Back', description: "Review yesterday's journal", icon: 'History', category: 'journal', xp: 15 },
  { title: 'Plan Ahead', description: "Plan tomorrow's tasks", icon: 'ListTodo', category: 'tasks', xp: 15 },
  { title: 'Quiet Mind', description: 'Do a 5-minute meditation', icon: 'Wind', category: 'wellness', xp: 10 },
  { title: 'Read On', description: 'Read for 30 minutes', icon: 'BookMarked', category: 'growth', xp: 20 },
];

const QUESTS_PER_DAY = 3;

/** Picks `QUESTS_PER_DAY` templates without repeats. questStore.ts only ever calls this
 * once per calendar day (it persists the result and checks the date before regenerating),
 * so a plain Math.random() shuffle is fine — there's no need for the result to be
 * reproducible for a given date. */
export function generateDailyQuests(dateKey: string): Quest[] {
  const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUESTS_PER_DAY).map((template, index) => ({
    id: `quest_${dateKey}_${index}`,
    title: template.title,
    description: template.description,
    icon: template.icon,
    category: template.category,
    xp: template.xp,
    isCompleted: false,
    date: dateKey,
    isCustom: false,
    isActive: true,
    isRecurring: false,
    recurrenceType: null,
  }));
}
