import { createSeedActivities } from '../mocks/mockActivities';
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
 * "Delete Account" is mock — there's no backend to actually delete an account against —
 * but it should still behave like a real wipe locally: every persisted store resets to its
 * fresh-install defaults, not just auth. Calling `setState` on a persisted zustand store
 * re-triggers its own persist write with the new value, so this overwrites each store's
 * saved data too, not just the in-memory copy — no separate `persist.clearStorage()` calls
 * needed. Activities reset to the app's own predefined seed set (not user data — only
 * custom ones are), while tasks/journal/chat/search go to genuinely empty, since those are
 * entirely user-created. `logout()` still runs last, for the token/session cleanup it
 * already owns.
 */
export async function deleteAccountLocally(): Promise<void> {
  useActivityStore.setState({ activities: createSeedActivities() });
  useTaskStore.setState({ tasks: [] });
  useJournalStore.setState({ entries: [] });
  useChatStore.setState({ messages: [] });
  useSearchStore.setState({ recentItems: [] });
  useDashboardStore.getState().resetPreferences();
  useSettingsStore.getState().resetSettings();
  useUiStore.setState({ isSidebarCollapsed: false });

  await useAuthStore.getState().logout();
}
