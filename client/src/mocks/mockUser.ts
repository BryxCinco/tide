import type { User } from '../types/user';

export const mockUser: User = {
  id: 'user_001',
  name: 'Juan Dela Cruz',
  email: 'juan@tide.app',
  avatar: undefined,
  createdAt: new Date().toISOString(),
  isGuest: false,
};

/**
 * Total Focus Time / Sessions / Current Streak have no real all-time aggregate anywhere
 * yet — timerStore.todaySessions is in-memory and scoped to "today" only, not persisted —
 * so per the Phase 8 spec these stay mock/static. Journal Entries is the one figure the
 * Profile screen computes live from journalStore instead of reusing this constant, since
 * showing a stale static count next to the user's actual journal list would look broken.
 */
export const MOCK_PROFILE_STATS = {
  totalFocusTime: '128h',
  sessions: '342',
  currentStreak: '12 days',
};
