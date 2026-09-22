import type { ReactNode } from 'react';
import { View } from 'react-native';
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
 * the same staggered entrance the Dashboard has always used. `size: 'compact'` widgets
 * (Fix 8's small tiles) get a flex-basis instead of the implicit full row every other
 * widget renders as, so 1/2/3 of them wrap onto the same row depending on available width
 * — a `flex-row flex-wrap` container achieves that without restructuring how every
 * existing full-size widget lays out. */
export function WidgetGrid({ widgets, renderWidget }: WidgetGridProps) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 24 }}>
      {widgets.map((widget, index) => (
        <Animated.View
          key={widget.id}
          entering={FadeInDown.delay(index * STAGGER_MS).duration(400)}
          style={widget.size === 'compact' ? { flexBasis: 220, flexGrow: 1 } : { flexBasis: '100%' }}
        >
          {renderWidget(widget.id)}
        </Animated.View>
      ))}
    </View>
  );
}
