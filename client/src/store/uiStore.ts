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
    }),
    {
      name: 'tide_ui',
      storage: createJSONStorage(() => storage),
      // isDrawerOpen is transient — persisting it would reopen the drawer on next launch.
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
);
