import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { cn } from '../../utils/cn';

const BODY_PADDING_V = 56; // p-7 top + bottom (28px each)

/** The body's own actual available height in px (already net of header/footer/padding), for
 * a `scrollable={false}` modal whose body needs to size an inner scrollable region itself
 * (e.g. a DraggableFlatList, which can't share ModalLayout's own ScrollView). `undefined`
 * while the surrounding Modal is `size="full"` (no cap to budget from) or before the first
 * layout pass has measured the header/footer. Prefer this over guessing a fraction of
 * `useWindowDimensions()` — a guess doesn't know the header/footer's actual height and can
 * hand a flat list more room than the modal box actually has, which visually overlaps the
 * footer instead of leaving space for it. */
const ModalBodyMaxHeightContext = createContext<number | undefined>(undefined);

export function useModalBodyMaxHeight(): number | undefined {
  return useContext(ModalBodyMaxHeightContext);
}

export interface ModalLayoutProps {
  /** Fixed at the top — title/icon/close button. Omit entirely for a modal with no header
   * (e.g. showCloseButton=false and no title). */
  header?: ReactNode;
  body: ReactNode;
  /** Fixed at the bottom, below the scrolling body — action buttons that must never get
   * scrolled out of view or pushed off-screen. Omitted modals render with no footer strip
   * at all (not an empty one), so a modal with no actions doesn't gain dead space. */
  footer?: ReactNode;
  /** Default true: body renders inside a ScrollView so overflowing content scrolls instead
   * of clipping or stretching the modal past its max height. Pass false when the caller
   * already manages its own internal scroll region (e.g. a fixed search bar above a
   * separately-scrolling result list) — nesting two ScrollViews fights itself on web. */
  scrollable?: boolean;
  /** 'full'-size modals fill all available height instead of hugging body content. */
  isFull?: boolean;
  /** Extra bottom padding under the footer (or body, if there's no footer) — the phone
   * bottom-sheet's safe-area inset, so content/actions never sit under the home indicator. */
  bottomInset?: number;
  /** The modal box's own height cap (Modal.tsx's `maxHeightPx`) — `undefined` for `isFull`,
   * which already fills 100% of the screen and needs no separate budget. Used to work out how
   * much of that budget the body actually gets to keep once the header/footer take theirs. */
  maxHeight?: number;
}

/**
 * The three-section skeleton every Modal renders through: a HEADER that never shrinks, a
 * BODY that grows/shrinks and scrolls on overflow, and an optional FOOTER that never shrinks
 * and stays pinned below the scrolling body. Because the body is the only flexible section,
 * action buttons in the footer can never get scrolled out of view or pushed off the bottom of
 * a short viewport — the two symptoms this layout exists to rule out for good.
 *
 * Deliberately does NOT lean on "flexShrink the body, let the max-height ancestor squeeze
 * it" — that's the usual flexbox recipe for this layout, but it depends on a flex container
 * whose own size is 'auto' (content-hugging) correctly re-distributing shrink to a flex-basis
 * 'auto' child once an ancestor's max-height clamps it smaller than the children's combined
 * natural size, and ScrollView's own natural size is its full, unclamped content height. Yoga
 * (and browsers, for what it's worth) are inconsistent enough about that specific combination
 * that it previously shipped with the footer silently rendered past the clamped box's bottom
 * edge, invisible under `overflow: hidden`. Measuring the header/footer via onLayout and
 * handing the body an explicit `maxHeight` number instead sidesteps that ambiguity entirely —
 * a plain `maxHeight` on a block correctly hugs shorter content and caps longer content, no
 * flex-distribution corner case involved.
 */
export function ModalLayout({ header, body, footer, scrollable = true, isFull = false, bottomInset = 0, maxHeight }: ModalLayoutProps) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  const onHeaderLayout = (event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height);
  const onFooterLayout = (event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height);

  // Only meaningful for a capped (non-`full`) modal — `maxHeight` is undefined for `full`,
  // which already has a definite, full-screen height that ordinary `flex: 1` resolves
  // correctly against (no auto-sizing ambiguity there).
  const bodyMaxHeight = maxHeight == null ? undefined : Math.max(0, maxHeight - headerHeight - footerHeight);
  // What useModalBodyMaxHeight() hands back — net of the body wrapper's own p-7 padding, so
  // a caller sizing an inner scroll region to this exact number doesn't still overflow it.
  const innerBodyMaxHeight = bodyMaxHeight == null ? undefined : Math.max(0, bodyMaxHeight - BODY_PADDING_V);

  return (
    <View style={isFull ? { flex: 1 } : undefined}>
      {header && (
        <View style={{ flexShrink: 0 }} onLayout={onHeaderLayout}>
          {header}
        </View>
      )}

      {scrollable ? (
        <ScrollView
          style={isFull ? { flex: 1 } : bodyMaxHeight != null ? { maxHeight: bodyMaxHeight } : undefined}
          contentContainerStyle={isFull ? { flexGrow: 1 } : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={cn('p-7', isFull && 'flex-1')} style={!footer ? { paddingBottom: 28 + bottomInset } : undefined}>
            {body}
          </View>
        </ScrollView>
      ) : (
        <View
          className={cn('p-7', isFull && 'flex-1')}
          style={[
            isFull ? { flex: 1 } : bodyMaxHeight != null ? { maxHeight: bodyMaxHeight, overflow: 'hidden' } : undefined,
            !footer && { paddingBottom: 28 + bottomInset },
          ]}
        >
          <ModalBodyMaxHeightContext.Provider value={innerBodyMaxHeight}>{body}</ModalBodyMaxHeightContext.Provider>
        </View>
      )}

      {footer && (
        <View style={{ flexShrink: 0, paddingBottom: 20 + bottomInset }} className="border-t border-subtle px-7 pt-5" onLayout={onFooterLayout}>
          {footer}
        </View>
      )}
    </View>
  );
}
