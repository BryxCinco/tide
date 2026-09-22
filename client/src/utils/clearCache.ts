import { useChatStore } from '../store/chatStore';
import { useSearchStore } from '../store/searchStore';
import { showToast } from '../store/toastStore';

/**
 * "Clear Cache" only touches state that's regenerable and non-essential: the search bar's
 * recent-items MRU list and the AI Coach's conversation history. It deliberately never
 * touches activities/tasks/journal entries (real user data — "Delete Account" is the only
 * button that's allowed to be that destructive) or settings/dashboard preferences (those
 * are standing choices, not a cache). The confirmation prompt itself lives at the call site
 * (profile.tsx, via confirmAsync) rather than in here, matching how every other destructive
 * action in this app (task delete, journal delete) already confirms before calling its
 * store action rather than the action confirming itself.
 */
export function clearCache(): void {
  useSearchStore.getState().clearRecent();
  useChatStore.getState().clearChat();
  showToast('Cache cleared');
}
