/**
 * Dependency-free mirrors of authStore's `isGuest`/`token`, kept purely so every other store
 * (activityStore, journalStore, questStore, taskStore, timerStore, settingsStore,
 * streakStore) can check "is this a guest session" / "do we actually have a token yet"
 * before hitting the backend, without importing authStore itself. authStore already imports
 * every one of those stores (for resetDomainStores) — if any of them imported authStore back
 * to read this state, that would be a circular import. This tiny module has no imports of
 * its own, so nothing can cycle through it.
 *
 * authStore.ts is the only writer (kept in sync via a `useAuthStore.subscribe(...)` call in
 * that file) — everything else only ever reads via `isGuestMode()`/`hasAuthToken()`.
 */
let isGuest = false;
let hasToken = false;

export function setGuestMode(value: boolean): void {
  isGuest = value;
}

export function isGuestMode(): boolean {
  return isGuest;
}

/** True once authStore has a token in memory (real account or guest). A dashboard-mount
 * fetch racing ahead of sign-in completing (or of restoreSession's verification) would
 * otherwise fire with no Authorization header at all and 401 for a reason that has nothing
 * to do with the token itself being invalid — this lets fetchers skip themselves until
 * there's actually something to authenticate with, the same way isGuestMode() lets them skip
 * themselves for guests. */
export function setHasAuthToken(value: boolean): void {
  hasToken = value;
}

export function hasAuthToken(): boolean {
  return hasToken;
}
