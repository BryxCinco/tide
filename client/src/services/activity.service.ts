import type { Activity, ActivityCategory, DayCode, RecurrenceType } from '../types/activity';
import { toDateKey } from '../utils/formatDate';
import { api } from './api';

export interface ApiActivity {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  category: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  recurrence_type: string | null;
  recurrence_days: string[] | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CreateActivityPayload {
  name: string;
  icon: string;
  color: string;
  category?: ActivityCategory;
  isFavorite?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceDays?: DayCode[];
  startDate?: string;
  endDate?: string | null;
}

export interface UpdateActivityPayload {
  name?: string;
  icon?: string;
  color?: string;
  category?: ActivityCategory;
  isFavorite?: boolean;
  isArchived?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceDays?: DayCode[];
  startDate?: string;
  endDate?: string | null;
}

function mapApiActivity(row: ApiActivity): Activity {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? 'Circle',
    color: row.color ?? '#14B8A6',
    category: (row.category as ActivityCategory | null) ?? 'custom',
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    recurrenceType: (row.recurrence_type as RecurrenceType | null) ?? 'none',
    recurrenceDays: (row.recurrence_days as DayCode[] | null) ?? [],
    startDate: row.start_date ?? toDateKey(new Date()),
    endDate: row.end_date,
  };
}

export const activityService = {
  async list(): Promise<Activity[]> {
    const { data } = await api.get<{ activities: ApiActivity[] }>('/api/activities');
    return data.activities.map(mapApiActivity);
  },

  async create(payload: CreateActivityPayload): Promise<Activity> {
    const { data } = await api.post<{ activity: ApiActivity }>('/api/activities', {
      name: payload.name,
      icon: payload.icon,
      color: payload.color,
      category: payload.category,
      is_favorite: payload.isFavorite,
      recurrence_type: payload.recurrenceType,
      recurrence_days: payload.recurrenceDays,
      start_date: payload.startDate,
      end_date: payload.endDate,
    });
    return mapApiActivity(data.activity);
  },

  async update(id: string, payload: UpdateActivityPayload): Promise<Activity> {
    const { data } = await api.patch<{ activity: ApiActivity }>(`/api/activities/${id}`, {
      name: payload.name,
      icon: payload.icon,
      color: payload.color,
      category: payload.category,
      is_favorite: payload.isFavorite,
      is_archived: payload.isArchived,
      recurrence_type: payload.recurrenceType,
      recurrence_days: payload.recurrenceDays,
      start_date: payload.startDate,
      end_date: payload.endDate,
    });
    return mapApiActivity(data.activity);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/activities/${id}`);
  },
};
