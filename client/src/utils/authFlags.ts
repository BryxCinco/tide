/**
 * A dependency-free mirror of authStore's `isGuest`, kept purely so every other store
 * (activityStore, journalStore, questStore, taskStore, timerStore, settingsStore,
 * streakStore) can check "is this a guest session" before hitting the backend, without
 * importing authStore itself. authStore already imports every one of those stores (for
 * resetDomainStores) — if any of them imported authStore back to read `isGuest`, that would
 * be a circular import. This tiny module has no imports of its own, so nothing can cycle
 * through it.
 *
 * authStore.ts is the only writer (kept in sync via a `useAuthStore.subscribe(...)` call in
 * that file) — everything else only ever reads via `isGuestMode()`.
 */
let isGuest = false;

export function setGuestMode(value: boolean): void {
  isGuest = value;
}

export function isGuestMode(): boolean {
  return isGuest;
}
