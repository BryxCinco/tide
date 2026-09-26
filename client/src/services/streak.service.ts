import type { Streak } from '../types/streak';
import { type ApiStreak, mapApiStreak } from './quest.service';
import { api } from './api';

export const streakService = {
  async get(): Promise<Streak> {
    const { data } = await api.get<{ streak: ApiStreak }>('/api/streaks');
    return mapApiStreak(data.streak);
  },
};
