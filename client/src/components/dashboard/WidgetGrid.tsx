import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { WidgetConfig, WidgetId } from '../../types/dashboard';

export interface WidgetGridProps {
  /** Already filtered to enabled widgets and sorted by order — see getVisibleWidgets. */
  widgets: WidgetConfig[];
  renderWidget: (id: WidgetId) => ReactNode;
}

const STAGGER_MS = 70;

/** Thin ordering layer: the Dashboard screen owns each widget's actual JSX (it already
 * has the mock data/handlers), this just lays them out in the user's chosen order with
 * the same staggered entrance the Dashboard has always used. */
export function WidgetGrid({ widgets, renderWidget }: WidgetGridProps) {
  return (
    <Animated.View className="gap-6">
      {widgets.map((widget, index) => (
        <Animated.View key={widget.id} entering={FadeInDown.delay(index * STAGGER_MS).duration(400)}>
          {renderWidget(widget.id)}
        </Animated.View>
      ))}
    </Animated.View>
  );
}
