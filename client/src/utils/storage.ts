import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Cross-platform key/value storage: expo-secure-store on native, localStorage on web. */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage unavailable (private browsing, quota, etc.) — non-fatal.
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage unavailable — non-fatal.
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
