import { create } from 'zustand';

import type { CoverType } from '../types/user';
import { useAuthStore } from './authStore';

export interface CoverGradient {
  id: string;
  colors: [string, string];
}

/** 8 presets for the Dashboard cover picker — teal/ocean-blue first since that's the
 * app's own signature gradient (see utils/gradients.ts), the rest just visual variety. */
export const COVER_GRADIENTS: CoverGradient[] = [
  { id: 'tide', colors: ['#14B8A6', '#0EA5E9'] },
  { id: 'dusk', colors: ['#8B5CF6', '#14B8A6'] },
  { id: 'sunset', colors: ['#F97316', '#EC4899'] },
  { id: 'ocean', colors: ['#0EA5E9', '#8B5CF6'] },
  { id: 'forest', colors: ['#10B981', '#0D9488'] },
  { id: 'twilight', colors: ['#6366F1', '#EC4899'] },
  { id: 'amber', colors: ['#F59E0B', '#EF4444'] },
  { id: 'slate', colors: ['#64748B', '#334155'] },
];

export const DEFAULT_COVER_GRADIENT_ID = COVER_GRADIENTS[0].id;

interface UserActions {
  updateProfile: (updates: { name?: string; bio?: string }) => void;
  updateAvatar: (avatarUri: string) => void;
  /** Distinct from `updateAvatar('')` — sets the field to `undefined` rather than an empty
   * string, so it round-trips cleanly through storage/export instead of leaving a stray "". */
  removeAvatar: () => void;
  updateCover: (coverType: CoverType, coverValue: string) => void;
  /** Clears both cover fields back to `undefined` — CoverPhoto/ProfileCover already fall
   * back to the default gradient preset when either is unset, so "remove" and "reset to
   * default" are the same action rather than a separate blank state to design for. */
  removeCover: () => void;
}

/**
 * This app has exactly one local profile — not a separate "profile service" — so rather
 * than duplicate identity fields (name/email/avatar) in a second persisted store and
 * risk it drifting from authStore.user, userStore is a thin, purpose-named action layer
 * that writes straight through to authStore.updateUser (which already persists). Reads
 * still go through `useAuth()`/`useAuthStore` directly; this store exists for the
 * Dashboard/Profile mutation call sites the spec asks for.
 */
export const useUserStore = create<UserActions>()(() => ({
  updateProfile: (updates) => useAuthStore.getState().updateUser(updates),
  updateAvatar: (avatarUri) => useAuthStore.getState().updateUser({ avatar: avatarUri }),
  removeAvatar: () => useAuthStore.getState().updateUser({ avatar: undefined }),
  updateCover: (coverType, coverValue) => useAuthStore.getState().updateUser({ coverType, coverValue }),
  removeCover: () => useAuthStore.getState().updateUser({ coverType: undefined, coverValue: undefined }),
}));
