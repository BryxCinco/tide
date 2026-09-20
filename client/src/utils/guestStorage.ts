import { storage } from './storage';

const GUEST_DATA_KEY = 'tide_guest_data';

/**
 * Placeholder shape — Time Tracker and Journal (Phase 4+) don't exist yet,
 * so this just reserves the slots guest data will eventually fill.
 */
export interface GuestData {
  timeLogs: unknown[];
  journalEntries: unknown[];
}

const emptyGuestData: GuestData = { timeLogs: [], journalEntries: [] };

export const guestStorage = {
  async getGuestData(): Promise<GuestData> {
    const raw = await storage.getItem(GUEST_DATA_KEY);
    if (!raw) return emptyGuestData;

    try {
      return JSON.parse(raw) as GuestData;
    } catch {
      return emptyGuestData;
    }
  },

  async setGuestData(data: GuestData): Promise<void> {
    await storage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
  },

  async clearGuestData(): Promise<void> {
    await storage.removeItem(GUEST_DATA_KEY);
  },

  /**
   * No backend yet, so "migrating" means re-keying the same local data under
   * the new account's id so future per-user lookups find it. Does not clear
   * the guest key itself — call clearGuestData() separately once the caller
   * is done reading the old data.
   */
  async migrateToAccount(userId: string): Promise<GuestData> {
    const data = await guestStorage.getGuestData();
    await storage.setItem(`tide_account_data_${userId}`, JSON.stringify(data));
    return data;
  },
};
