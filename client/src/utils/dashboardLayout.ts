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

/** Desktop gets the right rail only if it will actually hold something — Wave Stats (hidden
 * for guests and when its request fails) or at least one small widget. */
export function showRail({ isDesktop, wavesShown, railCount }: { isDesktop: boolean; wavesShown: boolean; railCount: number }): boolean {
  return isDesktop && (wavesShown || railCount > 0);
}

/**
 * Tide's Quest column width: each column needs ~272px to show its titles. Before the card has
 * been measured (`width` undefined) wide screens start 3-up and phones 1-up, so the card
 * doesn't render tall and then jump.
 */
export function questColumnBasis(width: number | undefined, count: number, isPhone: boolean): `${number}%` {
  const fit = width === undefined ? (isPhone ? 1 : count) : Math.max(1, Math.min(count, Math.floor((width + 12) / 272)));
  return `${Math.floor(100 / fit) - 4}%`;
}
