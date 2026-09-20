import type { User } from '../types/user';

export const mockUser: User = {
  id: 'user_001',
  name: 'Juan Dela Cruz',
  email: 'juan@tide.app',
  avatar: undefined,
  createdAt: new Date().toISOString(),
  isGuest: false,
};
