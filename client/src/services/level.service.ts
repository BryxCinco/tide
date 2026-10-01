import { api } from './api';

export interface ApiUserLevel {
  total_xp: number;
  level: number;
}

export interface UserLevel {
  totalXp: number;
  level: number;
}

export const levelService = {
  async get(): Promise<UserLevel> {
    const { data } = await api.get<{ level: ApiUserLevel }>('/api/levels');
    return { totalXp: data.level.total_xp, level: data.level.level };
  },
};
