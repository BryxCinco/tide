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
  updateProfile: (updates: { name?: string; bio?: string | null }) => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<void>;
  /** Distinct from `updateAvatar('')` — clears the field (`null`, all the way through to
   * the server) rather than an empty string, so it round-trips cleanly instead of leaving
   * a stray "". */
  removeAvatar: () => Promise<void>;
  updateCover: (coverType: CoverType, coverValue: string) => Promise<void>;
  /** Clears both cover fields — CoverPhoto/ProfileCover already fall back to the default
   * gradient preset when either is unset, so "remove" and "reset to default" are the same
   * action rather than a separate blank state to design for. */
  removeCover: () => Promise<void>;
}

/**
 * This app has exactly one local profile — not a separate "profile service" — so rather
 * than duplicate identity fields (name/email/avatar) in a second persisted store and risk
 * it drifting from authStore.user, userStore is a thin, purpose-named action layer over
 * authStore.syncProfile (which PATCHes the backend for real accounts, and falls back to a
 * local-only write for guests — see its own comment). Reads still go through
 * `useAuth()`/`useAuthStore` directly; this store exists for the Dashboard/Profile mutation
 * call sites the spec asks for. Every action here returns the underlying promise so callers
 * (AvatarPickerModal, CoverPicker, EditProfileModal) can await it, show a saving state, and
 * catch a failed save instead of assuming it always succeeds.
 */
export const useUserStore = create<UserActions>()(() => ({
  updateProfile: (updates) => useAuthStore.getState().syncProfile(updates),
  updateAvatar: (avatarUri) => useAuthStore.getState().syncProfile({ avatar: avatarUri }),
  removeAvatar: () => useAuthStore.getState().syncProfile({ avatar: null }),
  updateCover: (coverType, coverValue) => useAuthStore.getState().syncProfile({ coverType, coverValue }),
  removeCover: () => useAuthStore.getState().syncProfile({ coverType: null, coverValue: null }),
}));
