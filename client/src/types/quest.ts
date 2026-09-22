export type QuestCategory = 'focus' | 'journal' | 'tasks' | 'wellness' | 'growth';

export interface Quest {
  id: string;
  title: string;
  description: string;
  /** Lucide icon name, as a plain string (same convention as Activity.icon). */
  icon: string;
  category: QuestCategory;
  xp: number;
  isCompleted: boolean;
  completedAt?: string;
  /** Local "YYYY-MM-DD" the quest belongs to — see utils/formatDate.ts's toDateKey. */
  date: string;
}
