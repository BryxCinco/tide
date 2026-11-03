import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import type { WidgetId, WidgetInstance, WidgetSize } from '../../types/dashboard';
import { FadeInView } from '../ui';

export interface WidgetGridProps {
  /** Already filtered to enabled widgets and sorted by order — see getVisibleWidgets. */
  widgets: WidgetInstance[];
  renderWidget: (type: WidgetId, instance: WidgetInstance) => ReactNode;
}

/** phone 2-col, tablet 2-col, desktop 3-col — a widget's `size` spans up to that many of the
 * row's columns ('full' always spans every column, i.e. the whole row, regardless of size). */
function columnsFor(isPhone: boolean, isTablet: boolean): number {
  // 2 on phone so 'sm' widgets (time, streak) pair up instead of each taking a whole row;
  // 'md' / 'lg' / 'full' still span both.
  if (isPhone) return 2;
  if (isTablet) return 2;
  return 3;
}

function spanFor(size: WidgetSize, columns: number): number {
  if (size === 'full') return columns;
  if (size === 'lg') return Math.min(3, columns);
  if (size === 'md') return Math.min(2, columns);
  return 1;
}

/** Thin ordering/sizing layer: the Dashboard screen owns each widget's actual JSX (it
 * already has the mock data/handlers), this just lays instances out in the user's chosen
 * order and size with the same staggered entrance the Dashboard has always used. Keyed by
 * instance `id` (not `type`) now that more than one instance of the same type can exist. */
export function WidgetGrid({ widgets, renderWidget }: WidgetGridProps) {
  const { isPhone, isTablet } = useResponsive();
  const columns = columnsFor(isPhone, isTablet);

  return (
    <View className="flex-row flex-wrap" style={{ gap: isPhone ? 10 : 12 }}>
      {widgets.map((widget, index) => {
        const span = spanFor(widget.size, columns);
        const basisPercent = (span / columns) * 100;
        // Partial-width widgets grow to fill their row, so two small widgets share it instead
        // of leaving an empty third. The basis is shaved a little so the gaps still fit and
        // the widgets that should share a row don't wrap.
        return (
          <FadeInView
            key={widget.id}
            index={index + 7}
            style={{ flexBasis: basisPercent >= 100 ? '100%' : `${basisPercent - 2}%`, flexGrow: 1 }}
          >
            {renderWidget(widget.type, widget)}
          </FadeInView>
        );
      })}
    </View>
  );
}
