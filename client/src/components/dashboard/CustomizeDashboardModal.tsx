import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { getOrderedWidgets, useDashboardStore } from '../../store/dashboardStore';
import type { WidgetId } from '../../types/dashboard';
import { cn } from '../../utils/cn';
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
};

export interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Toggle + reorder UI for the Dashboard's widgets. Reordering is up/down buttons rather
 * than a drag handle — no drag-and-drop library is wired up yet, and this matches the
 * up/down pattern activities.tsx already uses for reordering activities.
 */
export function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const widgets = useDashboardStore((s) => s.preferences.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const resetPreferences = useDashboardStore((s) => s.resetPreferences);
  const themeColors = useThemeColors();

  const ordered = getOrderedWidgets(widgets);

  const moveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderWidgets(next.map((w) => w.id));
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Customize Dashboard" size="md">
      <View className="gap-2">
        {ordered.map((widget, index) => {
          const meta = WIDGET_LABELS[widget.id];
          const isFirst = index === 0;
          const isLast = index === ordered.length - 1;

          return (
            <View key={widget.id} className="flex-row items-center gap-2 rounded-xl border border-subtle bg-base p-3">
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
        })}
      </View>

      <Button title="Reset to Defaults" variant="ghost" size="sm" onPress={resetPreferences} className="mt-4" />
    </Modal>
  );
}
