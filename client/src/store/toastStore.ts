import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  message: string | null;
  variant: ToastVariant;
  /** Bumped on every `show()` so `Toast.tsx` can restart its auto-dismiss timer even when
   * the same message is shown twice in a row (state wouldn't otherwise change). */
  key: number;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

/**
 * Plain transient store (no persist middleware) — a toast is inherently a "right now"
 * notification, the same reasoning uiStore.ts documents for isDrawerOpen/isChatOpen.
 * `Toast.tsx` (mounted once in app/_layout.tsx, same pattern as ChatPanel/SearchModal) owns
 * the actual auto-dismiss timing; this store just holds what to show.
 */
export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  variant: 'success',
  key: 0,

  show: (message, variant = 'success') => set((state) => ({ message, variant, key: state.key + 1 })),
  hide: () => set({ message: null }),
}));

/** Non-hook entry point for call sites outside a component (utils/exportData.ts,
 * utils/cache.ts) — calling `useToastStore.getState().show(...)` directly at those sites
 * would work identically, but this reads better than a raw store getter at every call site. */
export function showToast(message: string, variant: ToastVariant = 'success'): void {
  useToastStore.getState().show(message, variant);
}
