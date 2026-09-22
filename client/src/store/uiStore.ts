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

  /** The AI Coach overlay's (ChatPanel.tsx) open state — transient, not persisted, same
   * reasoning as isDrawerOpen. Drives the one chat UI used at every screen width; see
   * ChatPanel.tsx's own header comment for why there used to be a phone-only fallback here. */
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
