import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useJournalStore } from '../../store/journalStore';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { cn } from '../../utils/cn';
import { formatWeekdayMonthDay, toDateKey } from '../../utils/formatDate';
import { formatDuration } from '../../utils/formatTime';
import { EmptyState, Icon, Input, Text, type IconName } from '../ui';

type HistoryType = 'all' | 'session' | 'journal' | 'task';

interface HistoryItem {
  id: string;
  type: 'session' | 'journal' | 'task';
  dateKey: string;
  /** Epoch ms for ordering within/across groups — sessions have no stored date (see the
   * comment below), so theirs is synthesized from array position only. */
  sortAt: number;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
}

const TYPE_FILTERS: { value: HistoryType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'session', label: 'Sessions' },
  { value: 'journal', label: 'Journals' },
  { value: 'task', label: 'Tasks' },
];

/**
 * Real data throughout — journalStore.entries and taskStore.tasks are fully persisted;
 * timerStore.todaySessions is real too but genuinely in-memory-only (not persisted, and
 * `Session` has no stored date, only formatted start/end clock strings) so every session
 * here shows under "Today" regardless of when it actually ran within this app session —
 * an honest reflection of what the store currently tracks, not a bug in this view.
 */
export function HistoryView() {
  const journalEntries = useJournalStore((s) => s.entries);
  const tasks = useTaskStore((s) => s.tasks);
  const sessions = useTimerStore((s) => s.todaySessions);

  const [typeFilter, setTypeFilter] = useState<HistoryType>('all');
  const [query, setQuery] = useState('');

  const items = useMemo<HistoryItem[]>(() => {
    const todayKey = toDateKey(new Date());

    const sessionItems: HistoryItem[] = sessions.map((session, i) => ({
      id: `session-${session.id}`,
      type: 'session',
      dateKey: todayKey,
      sortAt: 1e15 - i, // preserve the store's existing newest-first order, above all dated items
      title: session.activityLabel,
      subtitle: `${session.startTime} - ${session.endTime} · ${formatDuration(session.durationSeconds)}`,
      icon: session.icon as IconName,
      color: session.color,
    }));

    const journalItems: HistoryItem[] = journalEntries.map((entry) => ({
      id: `journal-${entry.id}`,
      type: 'journal',
      dateKey: toDateKey(new Date(entry.createdAt)),
      sortAt: new Date(entry.createdAt).getTime(),
      title: entry.title || 'Untitled entry',
      subtitle: entry.content.slice(0, 80),
      icon: 'BookOpen',
      color: '#8B5CF6',
    }));

    const taskItems: HistoryItem[] = tasks.map((task) => ({
      id: `task-${task.id}`,
      type: 'task',
      dateKey: toDateKey(new Date(task.createdAt)),
      sortAt: new Date(task.createdAt).getTime(),
      title: task.title,
      subtitle: task.status === 'done' ? 'Completed' : task.status === 'in-progress' ? 'In progress' : 'To do',
      icon: task.status === 'done' ? 'CheckCircle2' : 'Circle',
      color: task.status === 'done' ? '#14B8A6' : '#9CA3AF',
    }));

    return [...sessionItems, ...journalItems, ...taskItems].sort((a, b) => b.sortAt - a.sortAt);
  }, [sessions, journalEntries, tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    });
  }, [items, typeFilter, query]);

  const grouped = useMemo(() => {
    const groups: { dateKey: string; items: HistoryItem[] }[] = [];
    filtered.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.dateKey === item.dateKey) last.items.push(item);
      else groups.push({ dateKey: item.dateKey, items: [item] });
    });
    return groups;
  }, [filtered]);

  return (
    <View className="gap-4">
      <Input placeholder="Search history..." icon="Search" value={query} onChangeText={setQuery} />

      <View className="flex-row flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => {
          const active = typeFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => setTypeFilter(filter.value)}
              className={cn('rounded-full border px-3.5 py-1.5', active ? 'border-tide-teal bg-tide-teal' : 'border-subtle bg-elevated')}
            >
              <Text variant="caption" color={active ? 'inverse' : 'secondary'} className={cn('normal-case tracking-normal', active && 'font-semibold')}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {grouped.length === 0 ? (
        <EmptyState icon="History" title="Nothing here yet" description="Sessions, journal entries, and tasks will show up here as you go." />
      ) : (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {grouped.map((group) => (
            <View key={group.dateKey} className="mb-4 gap-1.5">
              <Text variant="label" color="muted">
                {formatWeekdayMonthDay(group.dateKey)}
              </Text>
              {group.items.map((item) => (
                <View key={item.id} className="flex-row items-center gap-3 rounded-xl px-2 py-2">
                  <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}1F` }}>
                    <Icon name={item.icon} size={15} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text variant="body" color="primary" className="font-medium" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text variant="caption" color="muted" className="capitalize tracking-normal">
                    {item.type}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
