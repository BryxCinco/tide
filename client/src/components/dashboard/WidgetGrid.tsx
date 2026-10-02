import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useResponsive } from '../../hooks/useResponsive';
import type { WidgetId, WidgetInstance, WidgetSize } from '../../types/dashboard';

export interface WidgetGridProps {
  /** Already filtered to enabled widgets and sorted by order — see getVisibleWidgets. */
  widgets: WidgetInstance[];
  renderWidget: (type: WidgetId, instance: WidgetInstance) => ReactNode;
}

const STAGGER_MS = 70;

/** phone 1-col, tablet 2-col, desktop 3-col (Phase 13 Fix 5) — a widget's `size` spans up to
 * that many of the row's columns ('full' always spans every column, i.e. the whole row,
 * regardless of size). On phone every size collapses to a single column since there's only
 * ever 1 to span. */
function columnsFor(isPhone: boolean, isTablet: boolean): number {
  if (isPhone) return 1;
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
    <View className="flex-row flex-wrap" style={{ gap: 24 }}>
      {widgets.map((widget, index) => {
        const span = spanFor(widget.size, columns);
        const basisPercent = (span / columns) * 100;
        return (
          <Animated.View
            key={widget.id}
            entering={FadeInDown.delay(index * STAGGER_MS).duration(400)}
            style={{ flexBasis: `${basisPercent}%`, flexGrow: basisPercent >= 100 ? 1 : 0 }}
          >
            {renderWidget(widget.type, widget)}
          </Animated.View>
        );
      })}
    </View>
  );
}
