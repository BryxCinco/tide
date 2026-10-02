import type { Quest, QuestCategory, QuestTier } from '../types/quest';
import { computeQuestXp } from './questXp';

interface QuestTemplate {
  title: string;
  description: string;
  icon: string;
  category: QuestCategory;
  tier: QuestTier;
}

/** Guest-mode-only fallback — no backend to call the real pattern-aware generator
 * (server/lib/questGenerator.js) against, so this is a plain random pick from a fixed pool,
 * same as before Tide's Quest existed, just with a tier/category per template now so guest
 * quests render identically to real ones (tier badges, auto-computed xp). */
const QUEST_POOL: QuestTemplate[] = [
  { title: 'Deep Focus', description: 'Track 2 hours of focus time today', icon: 'Brain', category: 'focus', tier: 3 },
  { title: 'Journal It', description: 'Write a journal entry', icon: 'BookOpen', category: 'journal', tier: 2 },
  { title: 'Task Sweep', description: 'Complete 3 tasks', icon: 'CheckSquare', category: 'tasks', tier: 2 },
  { title: 'Take a Breather', description: 'Take a 15-minute break', icon: 'Coffee', category: 'wellness', tier: 1 },
  { title: 'Something New', description: 'Try a new activity', icon: 'Sparkles', category: 'growth', tier: 2 },
  { title: 'Check In', description: 'Log your mood for the day', icon: 'Smile', category: 'wellness', tier: 1 },
  { title: 'Look Back', description: "Review yesterday's journal", icon: 'History', category: 'journal', tier: 2 },
  { title: 'Plan Ahead', description: "Plan tomorrow's tasks", icon: 'ListTodo', category: 'tasks', tier: 1 },
  { title: 'Quiet Mind', description: 'Do a 5-minute meditation', icon: 'Wind', category: 'wellness', tier: 1 },
  { title: 'Read On', description: 'Read for 30 minutes', icon: 'BookMarked', category: 'growth', tier: 1 },
  { title: 'Reach Out', description: "Message a friend you haven't talked to in a while", icon: 'MessageCircle', category: 'social', tier: 1 },
  { title: 'Spread Kindness', description: 'Give someone a genuine compliment', icon: 'Heart', category: 'social', tier: 1 },
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
    tier: template.tier,
    xp: computeQuestXp(template.tier),
    isCompleted: false,
    date: dateKey,
    isCustom: false,
    isActive: true,
    isRecurring: false,
    recurrenceType: null,
    isAgentic: false,
    generationReason: null,
  }));
}
