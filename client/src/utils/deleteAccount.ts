import { createSeedActivities } from '../mocks/mockActivities';
import { authService } from '../services/auth.service';
import { useActivityStore } from '../store/activityStore';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useJournalStore } from '../store/journalStore';
import { useSearchStore } from '../store/searchStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';

/**
 * Wipes every persisted store back to fresh-install defaults, not just auth. Calling
 * `setState` on a persisted zustand store re-triggers its own persist write with the new
 * value, so this overwrites each store's saved data too, not just the in-memory copy — no
 * separate `persist.clearStorage()` calls needed. Activities reset to the app's own
 * predefined seed set (not user data — only custom ones are), while tasks/journal/chat/search
 * go to genuinely empty, since those are entirely user-created. `logout()` still runs last,
 * for the token/session cleanup it already owns.
 *
 * This is the whole story for a guest (there's no backend account to delete against — see
 * `deleteAccount` below) but for a real account it's only step two, run after the backend
 * has actually deleted everything.
 */
function wipeLocalState(): Promise<void> {
  useActivityStore.setState({ activities: createSeedActivities() });
  useTaskStore.setState({ tasks: [] });
  useJournalStore.setState({ entries: [] });
  useChatStore.setState({ messages: [] });
  useSearchStore.setState({ recentItems: [] });
  useDashboardStore.getState().resetPreferences();
  useSettingsStore.getState().resetSettings();
  useUiStore.setState({ isSidebarCollapsed: false });

  return useAuthStore.getState().logout();
}

/**
 * `isGuest` decides whether this can actually reach a backend: guests were never given a
 * real Supabase account (loginAsGuest is entirely local-only — see authStore.ts), so there's
 * nothing on the server to delete and this falls back to the local-only wipe, same as
 * before. A real account calls the backend FIRST and lets it throw on failure — the local
 * wipe (and the logout() inside it) only runs once the account is actually confirmed gone
 * server-side, so a failed delete can't leave the user thinking their data is gone when it
 * isn't still sitting right there in Supabase.
 */
export async function deleteAccount(isGuest: boolean): Promise<void> {
  if (!isGuest) {
    await authService.deleteAccount();
  }
  await wipeLocalState();
}
