import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { cn } from '../../utils/cn';

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
}

/**
 * The three-section skeleton every Modal renders through: a HEADER that never shrinks, a
 * BODY that grows/shrinks and scrolls on overflow, and an optional FOOTER that never shrinks
 * and stays pinned below the scrolling body. Because the body is the only flexible section,
 * action buttons in the footer can never get scrolled out of view or pushed off the bottom of
 * a short viewport — the two symptoms this layout exists to rule out for good.
 *
 * Relies on a standard (if easy to get backwards) flexbox fact: a column container whose
 * height is "auto, capped at maxHeight" hugs short content exactly (no stretching, no
 * scrollbar) and only forces its flexGrow child (the body) to fill the leftover space once
 * content actually exceeds that cap. Modal.tsx supplies that maxHeight on the surrounding
 * box; this component only needs to mark header/footer as non-shrinking and the body as the
 * one flexible section.
 */
export function ModalLayout({ header, body, footer, scrollable = true, isFull = false, bottomInset = 0 }: ModalLayoutProps) {
  return (
    <View style={isFull ? { flex: 1 } : { flexShrink: 1 }}>
      {header && <View style={{ flexShrink: 0 }}>{header}</View>}

      {scrollable ? (
        <ScrollView
          style={{ flexGrow: 1, flexShrink: 1 }}
          contentContainerStyle={isFull ? { flexGrow: 1 } : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={cn('p-7', isFull && 'flex-1')} style={!footer ? { paddingBottom: 28 + bottomInset } : undefined}>
            {body}
          </View>
        </ScrollView>
      ) : (
        <View className={cn('p-7', isFull && 'flex-1')} style={[isFull && { flex: 1 }, !footer && { paddingBottom: 28 + bottomInset }]}>
          {body}
        </View>
      )}

      {footer && (
        <View style={{ flexShrink: 0, paddingBottom: 20 + bottomInset }} className="border-t border-subtle px-7 pt-5">
          {footer}
        </View>
      )}
    </View>
  );
}
