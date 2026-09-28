import type { CoverType, User } from '../types/user';
import { api } from './api';

export interface ApiSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface ApiProfile {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_type: string | null;
  cover_value: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

/** profiles rows are snake_case straight from Postgres; the client's User type is
 * camelCase. Every place a profile comes back from the API funnels through here so the
 * mapping only lives in one spot. */
export function mapProfileToUser(profile: ApiProfile): User {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    coverType: (profile.cover_type as CoverType | null) ?? undefined,
    coverValue: profile.cover_value ?? undefined,
    createdAt: profile.created_at,
    isGuest: false,
  };
}

export const authService = {
  async signup(email: string, password: string, name: string) {
    const { data } = await api.post<{ user: { id: string; email: string } | null; session: ApiSession | null }>(
      '/api/auth/signup',
      { email, password, name },
    );
    return data;
  },

  async login(email: string, password: string) {
    const { data } = await api.post<{ user: { id: string; email: string }; session: ApiSession }>('/api/auth/login', {
      email,
      password,
    });
    return data;
  },

  async logout() {
    await api.post('/api/auth/logout');
  },

  /** Irreversible — deletes every row belonging to this account, its uploaded files, and
   * the Supabase Auth user itself. See server/routes/auth.js's DELETE /account. */
  async deleteAccount() {
    await api.delete('/api/auth/account');
  },

  async me() {
    const { data } = await api.get<{ profile: ApiProfile }>('/api/auth/me');
    return data;
  },
};
