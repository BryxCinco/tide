import { useMemo } from 'react';
import { View } from 'react-native';

import { useTaskStore } from '../../../store/taskStore';
import { toDateKey } from '../../../utils/formatDate';
import { Card, Text } from '../../ui';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Current-month-only glance view (no prev/next navigation, unlike CalendarPicker.tsx —
 * this is a dashboard tile for "what does this month look like", not a date-entry
 * control) with a dot under any day that has a task due. Tapping a day to drill into its
 * tasks is spec'd as optional and is left out here to keep this a lightweight glance
 * widget. */
export function CalendarWidget() {
  const tasks = useTaskStore((s) => s.tasks);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const dueDates = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      if (task.dueDate) set.add(task.dueDate);
    });
    return set;
  }, [tasks]);

  const cells = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = mondayIndex(new Date(year, month, 1).getDay());

    const result: { key: string; day: number | null }[] = [];
    for (let i = 0; i < leadingBlanks; i++) result.push({ key: `blank-${i}`, day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ key: toDateKey(new Date(year, month, day)), day });
    }
    return result;
  }, [today]);

  return (
    <Card variant="default" padding="md" className="rounded-[24px] min-h-[150px] gap-2">
      <Text variant="caption" color="primary" className="font-semibold normal-case tracking-normal">
        {MONTH_FORMATTER.format(today)}
      </Text>

      <View className="flex-row">
        {WEEKDAY_INITIALS.map((label, i) => (
          <View key={i} style={{ width: `${100 / 7}%` }} className="items-center">
            <Text variant="caption" color="muted" style={{ fontSize: 9 }} className="normal-case tracking-normal">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((cell) => (
          <View key={cell.key} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
            {cell.day != null && (
              <View
                className={cell.key === todayKey ? 'h-5 w-5 items-center justify-center rounded-full bg-tide-teal' : 'h-5 w-5 items-center justify-center rounded-full'}
              >
                <Text
                  style={{ fontSize: 10 }}
                  variant="caption"
                  color={cell.key === todayKey ? 'inverse' : 'secondary'}
                  className="normal-case tracking-normal"
                >
                  {cell.day}
                </Text>
              </View>
            )}
            {cell.day != null && dueDates.has(cell.key) && cell.key !== todayKey && (
              <View className="mt-0.5 h-1 w-1 rounded-full bg-tide-teal" />
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}
