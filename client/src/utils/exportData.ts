import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { useActivityStore } from '../store/activityStore';
import { useAuthStore } from '../store/authStore';
import { useJournalStore } from '../store/journalStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { useTimerStore } from '../store/timerStore';
import { showToast } from '../store/toastStore';

/** Everything that's actually the user's own data or preferences — deliberately excludes
 * transient/cache state (uiStore, searchStore, chatStore), the same line cache.ts draws
 * the other direction. */
function buildExportPayload() {
  const { user } = useAuthStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    settings: useSettingsStore.getState().settings,
    activities: useActivityStore.getState().activities,
    tasks: useTaskStore.getState().tasks,
    journalEntries: useJournalStore.getState().entries,
    timerSessions: useTimerStore.getState().todaySessions,
  };
}

function exportFileName(): string {
  return `tide-data-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * Web downloads a real .json file via a Blob + temporary `<a download>` — the standard
 * browser mechanism, no dependency needed. Native writes the same JSON to a file in the
 * cache directory (a fittingly transient home for a scratch export — see Paths.cache's own
 * docs) and hands it to expo-sharing's share sheet, so the user picks where it actually
 * ends up (Files app, AirDrop, email, etc.) rather than this code guessing a destination.
 */
export async function exportUserData(): Promise<void> {
  const json = JSON.stringify(buildExportPayload(), null, 2);
  const fileName = exportFileName();

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
    return;
  }

  try {
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Tide Data' });
      showToast('Data exported successfully');
    } else {
      showToast(`Saved to ${file.uri}`, 'info');
    }
  } catch {
    showToast('Could not export your data — please try again.', 'error');
  }
}
