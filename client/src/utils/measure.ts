import type { RefObject } from 'react';
import type { View } from 'react-native';

export interface MeasuredPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Promise wrapper around RN's `measureInWindow` — window/viewport-relative coordinates.
 * This matters specifically for the theme-toggle ripple: a press event's
 * `pageX`/`pageY` are relative to the whole scrollable document on web, but the ripple
 * overlay is a full-screen `position: fixed`-equivalent layer measured against the
 * *viewport* — so on a scrolled page, pageX/Y and the overlay's coordinate space
 * disagree. `measureInWindow` reports the element's actual on-screen position, which
 * matches the overlay regardless of scroll.
 */
export function measureInWindow(ref: RefObject<View | null>): Promise<MeasuredPosition> {
  return new Promise((resolve, reject) => {
    const node = ref.current;
    if (!node) {
      reject(new Error('measureInWindow: ref is not attached to a mounted view'));
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}
