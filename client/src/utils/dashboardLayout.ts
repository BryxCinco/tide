/**
 * Focus-first Dashboard: small (`sm`) widgets — time, streak, calendar… — sit in the right
 * rail on desktop; everything else goes in the main column. Order is kept, so Customize
 * Dashboard's ordering still applies within each column. Pure, for tests.
 */
export function splitWidgets<T extends { size: string }>(widgets: T[]): { main: T[]; rail: T[] } {
  return {
    main: widgets.filter((w) => w.size !== 'sm'),
    rail: widgets.filter((w) => w.size === 'sm'),
  };
}
