export interface ViewTransitionOrigin {
  clientX: number;
  clientY: number;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

/**
 * Circular "reveal" theme swap driven by the browser's own CSS View Transitions API
 * (Chrome/Edge/Safari 18+) instead of a hand-rolled Reanimated overlay — the browser
 * compositor animates the actual pixel content directly, so it can't drop frames or show
 * partial coverage the way the old circle-scale approach sometimes did. Browsers without
 * support (Firefox, older Safari) fall back to an instant, un-animated swap rather than a
 * half-working imitation.
 */
export function revealThemeChange(origin: ViewTransitionOrigin, applyTheme: () => void): void {
  const doc = document as ViewTransitionDocument;

  if (!doc.startViewTransition) {
    applyTheme();
    return;
  }

  const { clientX: x, clientY: y } = origin;
  const right = window.innerWidth - x;
  const bottom = window.innerHeight - y;
  const maxRadius = Math.hypot(Math.max(x, right), Math.max(y, bottom));

  const transition = doc.startViewTransition(applyTheme);

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
      },
      {
        duration: 600,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}
