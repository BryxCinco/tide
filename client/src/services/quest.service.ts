import type { Quest, QuestCategory, QuestRecurrenceType, QuestTier } from '../types/quest';
import type { Streak } from '../types/streak';
import type { XpResult } from '../types/xp';
import { api } from './api';

export interface ApiQuest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  tier: number | null;
  xp: number;
  is_completed: boolean;
  completed_at: string | null;
  date: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  is_active: boolean;
  is_custom: boolean;
  is_agentic: boolean | null;
  generation_reason: string | null;
  created_at: string;
}

export interface QuestStreakInfo {
  currentStreak: number;
  longestStreak: number;
  weeklyCompletionRate: number;
}

export interface ApiStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface CreateQuestPayload {
  title: string;
  description: string;
  icon: string;
  category: QuestCategory;
  tier: QuestTier;
  /** 0.8-1.2 — xp is auto-computed server-side from tier + this, never hand-typed. */
  difficulty?: number;
  date: string;
  isRecurring?: boolean;
  recurrenceType?: QuestRecurrenceType | null;
  isActive?: boolean;
  /** false for the daily-generator's auto-seeded set, true for anything created through
   * QuestFormModal — only custom quests can be deleted outright (see quests.js). */
  isCustom?: boolean;
}

export interface UpdateQuestPayload {
  title?: string;
  description?: string;
  icon?: string;
  category?: QuestCategory;
  tier?: QuestTier;
  isActive?: boolean;
  isRecurring?: boolean;
  recurrenceType?: QuestRecurrenceType | null;
}

export function mapApiQuest(row: ApiQuest): Quest {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    icon: row.icon ?? 'Star',
    category: (row.category as QuestCategory | null) ?? 'growth',
    tier: ((row.tier as QuestTier | null) ?? 1) as QuestTier,
    xp: row.xp,
    isCompleted: row.is_completed,
    completedAt: row.completed_at ?? undefined,
    date: row.date,
    isCustom: row.is_custom,
    isActive: row.is_active,
    isRecurring: row.is_recurring,
    recurrenceType: (row.recurrence_type as QuestRecurrenceType | null) ?? null,
    isAgentic: row.is_agentic ?? false,
    generationReason: row.generation_reason,
  };
}

export function mapApiStreak(row: ApiStreak): Streak {
  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
  };
}

export const questService = {
  async list(date?: string): Promise<Quest[]> {
    const { data } = await api.get<{ quests: ApiQuest[] }>('/api/quests', { params: date ? { date } : undefined });
    return data.quests.map(mapApiQuest);
  },

  async create(payload: CreateQuestPayload): Promise<Quest> {
    const { data } = await api.post<{ quest: ApiQuest }>('/api/quests', {
      title: payload.title,
      description: payload.description,
      icon: payload.icon,
      category: payload.category,
      tier: payload.tier,
      difficulty: payload.difficulty,
      date: payload.date,
      is_recurring: payload.isRecurring,
      recurrence_type: payload.recurrenceType,
      is_active: payload.isActive,
      is_custom: payload.isCustom,
    });
    return mapApiQuest(data.quest);
  },

  /** Full edit — title/description/icon/category/tier/active/recurring. Does not touch
   * is_completed (use complete() for that), xp (auto-computed from tier), or date/is_custom,
   * which aren't user-editable. */
  async update(id: string, payload: UpdateQuestPayload): Promise<Quest> {
    const { data } = await api.patch<{ quest: ApiQuest }>(`/api/quests/${id}`, {
      title: payload.title,
      description: payload.description,
      icon: payload.icon,
      category: payload.category,
      tier: payload.tier,
      is_active: payload.isActive,
      is_recurring: payload.isRecurring,
      recurrence_type: payload.recurrenceType,
    });
    return mapApiQuest(data.quest);
  },

  /** Custom quests only — the server rejects this for generator-seeded ones (403); pause
   * those with update({isActive: false}) instead. */
  async remove(id: string): Promise<void> {
    await api.delete(`/api/quests/${id}`);
  },

  /** "Generate Today's Quests" — replaces today's non-custom quests with a fresh,
   * pattern-aware batch (same generator the AI's generateDailyQuests tool uses). */
  async generate(date?: string): Promise<Quest[]> {
    const { data } = await api.post<{ quests: ApiQuest[] }>('/api/quests/generate', date ? { date } : {});
    return data.quests.map(mapApiQuest);
  },

  async getStreak(): Promise<QuestStreakInfo> {
    const { data } = await api.get<QuestStreakInfo>('/api/quests/streak');
    return data;
  },

  /**
   * Returns the updated streak alongside the quest whenever completing it finished off
   * every quest for that day (null otherwise — see quests.js's bumpStreakIfDayComplete).
   * `isCompleted` defaults to true (the spec's "complete(id)" shape); questStore also calls
   * this with `false` to support un-checking a quest, which the PATCH route already handles
   * (it does NOT currently revoke a streak that was already credited earlier that day — a
   * known gap, called out in questStore).
   */
  async complete(id: string, isCompleted = true): Promise<{ quest: Quest; streak: Streak | null; xp: XpResult | null }> {
    const { data } = await api.patch<{ quest: ApiQuest; streak: ApiStreak | null; xp: XpResult | null }>(`/api/quests/${id}`, {
      is_completed: isCompleted,
    });
    return { quest: mapApiQuest(data.quest), streak: data.streak ? mapApiStreak(data.streak) : null, xp: data.xp };
  },
};
