import { useWindowDimensions, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { getOrderedWidgets, useDashboardStore } from '../../store/dashboardStore';
import type { WidgetConfig, WidgetId } from '../../types/dashboard';
import { cn } from '../../utils/cn';
import { soundManager } from '../../utils/soundManager';
import { Button, Icon, Modal, Text, type IconName } from '../ui';

const WIDGET_LABELS: Record<WidgetId, { label: string; icon: IconName }> = {
  hero: { label: "Today's Focus", icon: 'Target' },
  stats: { label: 'Stats Row', icon: 'BarChart3' },
  tasks: { label: "Today's Tasks", icon: 'ListChecks' },
  focusFlow: { label: 'Focus Flow', icon: 'Activity' },
  quote: { label: 'Quote of the Day', icon: 'Quote' },
  quickActions: { label: 'Quick Actions', icon: 'Zap' },
  recentActivity: { label: 'Recent Activity', icon: 'Clock' },
  recentJournal: { label: 'Recent Journal', icon: 'Book' },
  insights: { label: 'Weekly Insights', icon: 'TrendingUp' },
  habits: { label: 'Habit Tracker', icon: 'CheckSquare' },
  time: { label: 'Time', icon: 'Clock' },
  calendar: { label: 'Mini Calendar', icon: 'Calendar' },
  weather: { label: 'Weather', icon: 'Sun' },
  weeklyProgress: { label: 'Weekly Progress', icon: 'PieChart' },
  streak: { label: 'Streak', icon: 'Flame' },
  todaysRoutine: { label: "Today's Routine", icon: 'Repeat' },
};

export interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Toggle + reorder UI for the Dashboard's widgets. Two ways to reorder, both saving to the
 * same dashboardStore.reorderWidgets:
 * - Drag the GripVertical handle — DraggableFlatList, works with mouse on web and touch on
 *   mobile alike.
 * - The ChevronUp/ChevronDown buttons — a one-tap-at-a-time fallback that doesn't require
 *   a precise drag gesture, which is the harder of the two on a small touchscreen.
 * Both are kept rather than picking one, since they suit different input methods.
 */
export function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const widgets = useDashboardStore((s) => s.preferences.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const resetPreferences = useDashboardStore((s) => s.resetPreferences);
  const themeColors = useThemeColors();
  const { height } = useWindowDimensions();

  const ordered = getOrderedWidgets(widgets);

  const moveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderWidgets(next.map((w) => w.id));
  };

  const renderItem = ({ item: widget, getIndex, drag, isActive }: RenderItemParams<WidgetConfig>) => {
    const index = getIndex() ?? 0;
    const meta = WIDGET_LABELS[widget.id];
    const isFirst = index === 0;
    const isLast = index === ordered.length - 1;

    return (
      <View
        className={cn(
          'mb-2 flex-row items-center gap-2 rounded-xl border border-subtle bg-base p-3',
          isActive && 'border-tide-teal',
        )}
        style={isActive ? { opacity: 0.9, transform: [{ scale: 1.02 }] } : undefined}
      >
        <Pressable
          onPressIn={() => {
            soundManager.play('tap');
            drag();
          }}
          hitSlop={8}
          className="cursor-grab"
        >
          <Icon name="GripVertical" size={16} color={themeColors.text.disabled} />
        </Pressable>

        <Icon name={meta.icon} size={18} color={widget.enabled ? themeColors.brand.tideTeal : undefined} />
        <Text variant="body" color={widget.enabled ? 'primary' : 'muted'} className="flex-1 font-medium" numberOfLines={1}>
          {meta.label}
        </Text>

        <Pressable onPress={() => moveWidget(index, -1)} disabled={isFirst} hitSlop={6} className={isFirst ? 'opacity-30' : undefined}>
          <Icon name="ChevronUp" size={16} />
        </Pressable>
        <Pressable onPress={() => moveWidget(index, 1)} disabled={isLast} hitSlop={6} className={isLast ? 'opacity-30' : undefined}>
          <Icon name="ChevronDown" size={16} />
        </Pressable>

        <Pressable
          onPress={() => toggleWidget(widget.id)}
          hitSlop={6}
          className={cn('ml-1 h-6 w-11 justify-center rounded-full px-0.5', widget.enabled ? 'bg-tide-teal' : 'bg-hover')}
        >
          <View className={cn('h-5 w-5 rounded-full bg-base', widget.enabled ? 'self-end' : 'self-start')} />
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Customize Dashboard" icon="LayoutGrid" size="md">
      <View style={{ maxHeight: height * 0.55 }}>
        <DraggableFlatList
          data={ordered}
          keyExtractor={(widget) => widget.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderWidgets(data.map((w) => w.id))}
          showsVerticalScrollIndicator={false}
          activationDistance={4}
        />
      </View>

      <Button title="Reset to Defaults" variant="ghost" size="sm" onPress={resetPreferences} className="mt-4" />
    </Modal>
  );
}
