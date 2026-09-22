function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Local-calendar "YYYY-MM-DD", e.g. for CalendarPicker/Task.dueDate. Deliberately not
 * `date.toISOString().slice(0, 10)` — that converts to UTC first, which silently rolls the
 * date back a day for anyone west of UTC in the evening. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Inverse of toDateKey — parses as local midnight, not `new Date("YYYY-MM-DD")`'s UTC
 * midnight (which the same day-rollback problem above). */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "Sep 25, 2026" — compact, for the Due Date field's closed/display state. Falls back to
 * including the year unconditionally (unlike formatEntryDate) since a due date far in the
 * future or past reading as e.g. just "Sep 25" would be ambiguous. */
export function formatDateKeyShort(key: string): string {
  return fromDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Today" / "Yesterday" / "Sep 21" (adds the year only when it isn't the current one). */
export function formatEntryDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** "Sunday, September 21, 2026" — used in the editor/detail header. */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Monday, September 21" — the prominent date shown on journal cards. */
export function formatWeekdayMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "September 21, 2026" — the large date heading in the journal editor. */
export function formatMonthDayYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "Monday" */
export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
}

/** "3:45 PM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
