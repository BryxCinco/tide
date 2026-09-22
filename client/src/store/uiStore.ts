import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../utils/storage';

interface UiState {
  /** The mobile slide-in drawer's open state — transient view state, not persisted. */
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  /** Desktop sidebar's manual icons-only mode — persisted, unlike the drawer, since it's
   * a standing layout preference rather than a momentary open/close state. */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** The AI Coach side-panel's open state (desktop/tablet) — transient, not persisted,
   * same reasoning as isDrawerOpen. Mobile doesn't use this at all; the FAB there
   * navigates to the full-screen /chat route instead (see ChatbotFAB.tsx). */
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      isChatOpen: false,
      openChat: () => set({ isChatOpen: true }),
      closeChat: () => set({ isChatOpen: false }),
    }),
    {
      name: 'tide_ui',
      storage: createJSONStorage(() => storage),
      // isDrawerOpen/isChatOpen are transient — persisting either would reopen it on next launch.
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
);
