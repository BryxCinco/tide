/** Time-of-day greeting. `hour` is 0-23, defaults to the current local hour. */
export function getGreeting(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 17) return 'Good afternoon';
  if (hour >= 18 && hour <= 21) return 'Good evening';
  return 'Still up?';
}

/** e.g. "Monday, September 21" */
export function getFormattedDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
