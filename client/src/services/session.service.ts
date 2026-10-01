import type { Session } from '../types/timer';
import type { XpResult } from '../types/xp';
import { formatClockTime } from '../utils/formatTime';
import { api } from './api';

export interface ApiSession {
  id: string;
  user_id: string;
  activity_id: string | null;
  activity_name: string | null;
  duration_seconds: number;
  notes: string | null;
  tags: string[] | null;
  started_at: string | null;
  ended_at: string;
  created_at: string;
}

export interface CreateSessionPayload {
  activityId: string;
  activityName: string;
  durationSeconds: number;
  notes?: string;
  tags?: string[];
  startedAt?: string;
  endedAt?: string;
}

/** time_logs has no icon/color columns (those live on the Activity, not the log row), so
 * this maps everything except those two — callers join them in from activityStore by
 * activityId, same as TodayLogs/ActivityBreakdown already resolve activity display data. */
export function mapApiSession(row: ApiSession): Omit<Session, 'icon' | 'color'> {
  return {
    id: row.id,
    activityId: row.activity_id ?? '',
    activityLabel: row.activity_name ?? 'Focus Session',
    startTime: row.started_at ? formatClockTime(new Date(row.started_at)) : formatClockTime(new Date(row.ended_at)),
    endTime: formatClockTime(new Date(row.ended_at)),
    durationSeconds: row.duration_seconds,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
  };
}

export const sessionService = {
  async list(params?: { from?: string; to?: string }): Promise<ApiSession[]> {
    const { data } = await api.get<{ sessions: ApiSession[] }>('/api/sessions', { params });
    return data.sessions;
  },

  async create(payload: CreateSessionPayload): Promise<{ session: ApiSession; xp: XpResult | null }> {
    const { data } = await api.post<{ session: ApiSession; xp: XpResult | null }>('/api/sessions', {
      activity_id: payload.activityId,
      activity_name: payload.activityName,
      duration_seconds: payload.durationSeconds,
      notes: payload.notes,
      tags: payload.tags,
      started_at: payload.startedAt,
      ended_at: payload.endedAt,
    });
    return { session: data.session, xp: data.xp };
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/sessions/${id}`);
  },
};
