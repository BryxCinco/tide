import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { getOrderedWidgets, useDashboardStore } from '../../store/dashboardStore';
import type { WidgetId, WidgetInstance, WidgetSize } from '../../types/dashboard';
import { cn } from '../../utils/cn';
import { soundManager } from '../../utils/soundManager';
import { Button, Icon, Modal, Text, useModalBodyMaxHeight, type IconName } from '../ui';

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

const WIDGET_TYPES = Object.keys(WIDGET_LABELS) as WidgetId[];

/** The scrollable list itself, split out as its own component purely so it can call
 * useModalBodyMaxHeight() — that hook only resolves to a real number inside Modal's own
 * `children` subtree (see ModalLayout's Context.Provider), not in CustomizeDashboardModal's
 * own top-level scope, which renders ABOVE/around the `<Modal>` that provides it. Falls back
 * to a generous fixed height on the very first render, before the surrounding Modal has
 * measured its header/footer. */
function WidgetDraggableList({
  ordered,
  renderItem,
  onDragEnd,
}: {
  ordered: WidgetInstance[];
  renderItem: (params: RenderItemParams<WidgetInstance>) => ReactElement;
  onDragEnd: (data: WidgetInstance[]) => void;
}) {
  const bodyMaxHeight = useModalBodyMaxHeight();

  return (
    <View style={{ maxHeight: bodyMaxHeight ?? 320 }}>
      <DraggableFlatList
        data={ordered}
        keyExtractor={(widget) => widget.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => onDragEnd(data)}
        showsVerticalScrollIndicator={false}
        activationDistance={4}
      />
    </View>
  );
}

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'full', label: 'Full' },
];

export interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Toggle + reorder + resize + add/remove UI for the Dashboard's widgets. Two ways to
 * reorder, both saving to the same dashboardStore.reorderWidgets:
 * - Drag the GripVertical handle — DraggableFlatList, works with mouse on web and touch on
 *   mobile alike.
 * - The ChevronUp/ChevronDown buttons — a one-tap-at-a-time fallback that doesn't require
 *   a precise drag gesture, which is the harder of the two on a small touchscreen.
 * Both are kept rather than picking one, since they suit different input methods.
 */
export function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const widgets = useDashboardStore((s) => s.preferences.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const setWidgetSize = useDashboardStore((s) => s.setWidgetSize);
  const addWidgetInstance = useDashboardStore((s) => s.addWidgetInstance);
  const removeWidgetInstance = useDashboardStore((s) => s.removeWidgetInstance);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const resetPreferences = useDashboardStore((s) => s.resetPreferences);
  const themeColors = useThemeColors();
  const [addVisible, setAddVisible] = useState(false);

  const ordered = getOrderedWidgets(widgets);
  const typeCounts = ordered.reduce<Partial<Record<WidgetId, number>>>((acc, w) => {
    acc[w.type] = (acc[w.type] ?? 0) + 1;
    return acc;
  }, {});

  const moveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderWidgets(next.map((w) => w.id));
  };

  const handleAddWidget = (type: WidgetId) => {
    addWidgetInstance(type);
    setAddVisible(false);
  };

  const renderItem = ({ item: widget, getIndex, drag, isActive }: RenderItemParams<WidgetInstance>) => {
    const index = getIndex() ?? 0;
    const meta = WIDGET_LABELS[widget.type];
    const isFirst = index === 0;
    const isLast = index === ordered.length - 1;
    const isDuplicate = (typeCounts[widget.type] ?? 0) > 1;

    return (
      <View
        className={cn('mb-2 gap-2 rounded-xl border border-subtle bg-base p-3', isActive && 'border-tide-teal')}
        style={isActive ? { opacity: 0.9, transform: [{ scale: 1.02 }] } : undefined}
      >
        <View className="flex-row items-center gap-2">
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

          {isDuplicate && (
            <Pressable onPress={() => removeWidgetInstance(widget.id)} hitSlop={6}>
              <Icon name="Trash2" size={16} color={themeColors.status.error} />
            </Pressable>
          )}

          <Pressable
            onPress={() => toggleWidget(widget.id)}
            hitSlop={6}
            className={cn('ml-1 h-6 w-11 justify-center rounded-full px-0.5', widget.enabled ? 'bg-tide-teal' : 'bg-hover')}
          >
            <View className={cn('h-5 w-5 rounded-full bg-base', widget.enabled ? 'self-end' : 'self-start')} />
          </Pressable>
        </View>

        <View className="flex-row gap-1.5 pl-6">
          {SIZE_OPTIONS.map((option) => {
            const isSelected = widget.size === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setWidgetSize(widget.id, option.value)}
                className={cn('rounded-md border px-2 py-0.5', isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-surface')}
              >
                <Text variant="caption" color={isSelected ? 'accent' : 'muted'} className="normal-case tracking-normal">
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Customize Dashboard"
      icon="LayoutGrid"
      size="md"
      scrollable={false}
      footer={
        <View className="flex-row gap-2">
          <Button title="+ Add Widget" variant="secondary" size="sm" onPress={() => setAddVisible(true)} className="flex-1" />
          <Button title="Reset to Defaults" variant="ghost" size="sm" onPress={resetPreferences} className="flex-1" />
        </View>
      }
    >
      {/* DraggableFlatList renders its own internal ScrollView, so the outer Modal's body is
          deliberately non-scrollable (scrollable=false above) — nesting a VirtualizedList
          inside another ScrollView breaks virtualization and logs an RN warning.
          WidgetDraggableList's own maxHeight (from useModalBodyMaxHeight) is what lets the
          list scroll on its own within the modal's actual bounds instead of growing past
          them into the footer. */}
      <WidgetDraggableList ordered={ordered} renderItem={renderItem} onDragEnd={(data) => reorderWidgets(data.map((w) => w.id))} />

      <Modal visible={addVisible} onClose={() => setAddVisible(false)} title="Add Widget" icon="Plus" size="sm">
        <View className="gap-1">
          {WIDGET_TYPES.map((type) => {
            const meta = WIDGET_LABELS[type];
            return (
              <Pressable key={type} onPress={() => handleAddWidget(type)} className="flex-row items-center gap-3 rounded-xl px-3 py-3 hover:bg-elevated">
                <Icon name={meta.icon} size={18} color={themeColors.text.secondary} />
                <Text variant="body" color="primary" className="normal-case tracking-normal">
                  {meta.label}
                </Text>
                {(typeCounts[type] ?? 0) > 0 && (
                  <Text variant="caption" color="muted" className="ml-auto normal-case tracking-normal">
                    {typeCounts[type]} added
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </Modal>
  );
}
