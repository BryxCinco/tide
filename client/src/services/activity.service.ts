import type { Activity, ActivityCategory } from '../types/activity';
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
}

export interface CreateActivityPayload {
  name: string;
  icon: string;
  color: string;
  category?: ActivityCategory;
  isFavorite?: boolean;
}

export interface UpdateActivityPayload {
  name?: string;
  icon?: string;
  color?: string;
  category?: ActivityCategory;
  isFavorite?: boolean;
  isArchived?: boolean;
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
    });
    return mapApiActivity(data.activity);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/activities/${id}`);
  },
};
