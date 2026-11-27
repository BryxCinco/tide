import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types/task';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { BOARD_COLUMNS, groupTasksByStatus } from '../../utils/taskBoard';
import { BentoTile, FadeInView, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { BoardCard } from './BoardCard';
import { InlineTaskInput } from './InlineTaskInput';

export interface TaskBoardProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
}

/**
 * Kanban board: To do · In progress · Done. Desktop shows the columns side by side; phone
 * pages through them horizontally with a pill switcher on top. Cards move by their status
 * chip (no drag and drop — tapping is reliable on touch and web alike).
 */
export function TaskBoard({ tasks, onOpen }: TaskBoardProps) {
  const { isPhone, width } = useResponsive();
  const addTask = useTaskStore((s) => s.addTask);
  const groups = groupTasksByStatus(tasks);
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const columnWidth = width - 40;

  const column = (index: number) => {
    const col = BOARD_COLUMNS[index];
    const items = groups[col.status];
    return (
      <BentoTile key={col.status} tone="surface" dense index={index} className={isPhone ? undefined : 'flex-1'} style={isPhone ? { width: columnWidth } : undefined}>
        <View className="gap-2">
          <View className="flex-row items-center gap-2 px-1 pb-1">
            <View className="flex-row items-center gap-1.5 rounded-md px-2 py-0.5" style={{ backgroundColor: hexToRgba(col.color, 0.14) }}>
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              <Text variant="body" className="text-[13px] font-semibold" style={{ color: col.color }}>
                {col.label}
              </Text>
            </View>
            <Text variant="body" color="muted" className="text-[13px]">
              {items.length}
            </Text>
          </View>

          {items.length === 0 && (
            <View className="items-center rounded-2xl border border-dashed border-default py-5">
              <Text variant="body" color="muted" className="text-[12.5px]">
                No tasks
              </Text>
            </View>
          )}
          {items.map((task, i) => (
            <FadeInView key={task.id} index={i}>
              <BoardCard task={task} onOpen={() => onOpen(task)} />
            </FadeInView>
          ))}

          {col.status !== 'done' && (
            <InlineTaskInput onSubmit={(title) => addTask({ title, status: col.status, priority: 'medium', tags: [] })} />
          )}
        </View>
      </BentoTile>
    );
  };

  if (!isPhone) {
    return <View className="flex-row items-start gap-3">{BOARD_COLUMNS.map((_, i) => column(i))}</View>;
  }

  return (
    <View className="gap-2.5">
      <View className="flex-row gap-1.5">
        {BOARD_COLUMNS.map((col, i) => (
          <Pressable
            key={col.status}
            onPress={() => {
              setPage(i);
              scroller.current?.scrollTo({ x: i * (columnWidth + 10), animated: true });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: page === i }}
            className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', page === i ? 'border-transparent' : 'border-default')}
            style={page === i ? { backgroundColor: hexToRgba(col.color, 0.16) } : undefined}
          >
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
            <Text variant="body" color={page === i ? 'primary' : 'muted'} className="text-[12.5px] font-medium">
              {col.label} · {groups[col.status].length}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={columnWidth + 10}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (columnWidth + 10)))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (columnWidth + 10)))}
        scrollEventThrottle={64}
        contentContainerStyle={{ gap: 10, alignItems: 'flex-start' }}
      >
        {BOARD_COLUMNS.map((_, i) => column(i))}
      </ScrollView>
    </View>
  );
}
