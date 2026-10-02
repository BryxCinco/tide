import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatbotFAB,
  CustomizeDashboardModal,
  QuestCard,
  FocusFlow,
  HabitTracker,
  HeroCard,
  ProfileHeader,
  QuickActions,
  QuoteCard,
  RecentActivity,
  RecentJournal,
  StatsRow,
  TodaysTasks,
  WidgetGrid,
} from '@/components/dashboard';
import { CalendarWidget, StreakWidget, TimeWidget, TodaysRoutineWidget, WeatherWidget, WeeklyProgressWidget } from '@/components/dashboard/widgets';
import { TaskFormModal } from '@/components/tasks';
import { Button, EmptyState, ResponsiveContainer } from '@/components/ui';
import { MOOD_ICON_MAP } from '@/components/journal/MoodIcon';
import { mockHeroFocus, mockQuickActions } from '@/mocks/mockDashboard';
import { getVisibleWidgets, useDashboardStore } from '@/store/dashboardStore';
import { useJournalStore } from '@/store/journalStore';
import { useLevelStore } from '@/store/levelStore';
import { useQuestStore } from '@/store/questStore';
import { useStreakStore } from '@/store/streakStore';
import { isTaskOverdue, useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import type { AccentTone, FocusActivity, JournalPreview, StatItem, TimeLogEntry, WidgetId } from '@/types/dashboard';
import { formatEntryDate } from '@/utils/formatDate';
import { formatDuration } from '@/utils/formatTime';
import { progressToNextLevel } from '@/utils/xp';

const FOCUS_BREAKDOWN_TINTS: AccentTone[] = ['teal', 'blue', 'purple'];

export default function DashboardScreen() {
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allWidgets = useDashboardStore((s) => s.preferences.widgets);
  const visibleWidgets = useMemo(() => getVisibleWidgets(allWidgets), [allWidgets]);

  const todaySessions = useTimerStore((s) => s.todaySessions);
  const activityTotals = useTimerStore((s) => s.activityTotals);
  const fetchTodaySessions = useTimerStore((s) => s.fetchTodaySessions);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchStreak = useStreakStore((s) => s.fetchStreak);
  const journalEntries = useJournalStore((s) => s.entries);
  const fetchJournalEntries = useJournalStore((s) => s.fetchEntries);
  const journalCount = journalEntries.length;
  const streak = useQuestStore((s) => s.streak);
  const level = useLevelStore((s) => s.level);
  const totalXp = useLevelStore((s) => s.totalXp);
  const fetchLevel = useLevelStore((s) => s.fetchLevel);

  // QuestCard fetches today's quests itself on its own mount (it's reused on both the
  // Dashboard and Tasks screen) — calling fetchTodayQuests again here would just be a
  // redundant duplicate request, so it's deliberately left out of this effect.
  useEffect(() => {
    fetchTodaySessions();
    fetchTasks();
    fetchStreak();
    fetchLevel();
    fetchJournalEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodaySessions(), fetchTasks(), fetchStreak(), fetchLevel(), fetchJournalEntries()]);
    setRefreshing(false);
  };

  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);
  const openTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const missedTasksCount = tasks.filter(isTaskOverdue).length;
  const isFreshStart = todaySessions.length === 0 && tasks.length === 0 && journalCount === 0;

  // Fresh-start-friendly: real zeros instead of the old fabricated "2h 14m / 4 today /
  // 12 days / Productive" mock numbers. No "trend" values either — a trend needs a
  // yesterday-vs-today comparison that doesn't exist yet, and a fake one would be
  // dishonest about data that IS real.
  const liveStats: StatItem[] = [
    { id: 'focus-time', label: 'Focus Time Today', value: formatDuration(todayTotalSeconds), icon: 'Clock', tint: 'teal' },
    { id: 'sessions', label: 'Sessions', value: `${todaySessions.length} today`, icon: 'Target', tint: 'blue' },
    { id: 'tasks', label: 'Open Tasks', value: `${openTasksCount}`, icon: 'ListChecks', tint: 'purple' },
    { id: 'streak', label: 'Streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: 'Flame', tint: 'muted' },
    { id: 'missed-tasks', label: 'Missed Tasks', value: `${missedTasksCount}`, icon: 'AlertTriangle', tint: missedTasksCount > 0 ? 'red' : 'muted' },
    { id: 'level', label: 'Level', value: `Level ${level}`, icon: 'Trophy', tint: 'teal', progress: progressToNextLevel(totalXp) },
  ];

  const heroSubtitle = todaySessions.length > 0 ? `${formatDuration(todayTotalSeconds)} tracked today` : mockHeroFocus.subtitle;

  // Real per-activity breakdown for today, grouped from todaySessions (which already carry
  // their activity's label snapshotted at completion time — see Session's own doc comment),
  // sorted largest-first so the most relevant activity reads first.
  const focusActivities: FocusActivity[] = useMemo(() => {
    const totals = new Map<string, { label: string; seconds: number }>();
    for (const session of todaySessions) {
      const existing = totals.get(session.activityId);
      if (existing) {
        existing.seconds += session.durationSeconds;
      } else {
        totals.set(session.activityId, { label: session.activityLabel, seconds: session.durationSeconds });
      }
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .map(([id, data], index) => ({
        id,
        label: data.label,
        duration: formatDuration(data.seconds),
        percentage: todayTotalSeconds > 0 ? Math.round((data.seconds / todayTotalSeconds) * 100) : 0,
        tint: FOCUS_BREAKDOWN_TINTS[index % FOCUS_BREAKDOWN_TINTS.length],
      }));
  }, [todaySessions, todayTotalSeconds]);

  // "What fraction of the day so far have you spent in a tracked focus session" — real and
  // derivable from data that already exists, unlike a fabricated "productivity" score. Capped
  // at 100 since someone tracking overlapping/edited sessions could otherwise exceed it.
  const focusScore = useMemo(() => {
    const now = new Date();
    const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (secondsSinceMidnight <= 0) return 0;
    return Math.min(100, Math.round((todayTotalSeconds / secondsSinceMidnight) * 100));
  }, [todayTotalSeconds]);

  const recentActivityEntries: TimeLogEntry[] = useMemo(
    () =>
      todaySessions.slice(0, 5).map((session) => ({
        id: session.id,
        activity: session.activityLabel,
        icon: session.icon as TimeLogEntry['icon'],
        tint: 'teal',
        startTime: session.startTime,
        endTime: session.endTime,
        duration: formatDuration(session.durationSeconds),
      })),
    [todaySessions]
  );

  const recentJournalEntries: JournalPreview[] = useMemo(
    () =>
      journalEntries.slice(0, 3).map((entry) => ({
        id: entry.id,
        date: formatEntryDate(entry.createdAt),
        title: entry.title,
        preview: entry.content,
        mood: entry.mood ? MOOD_ICON_MAP[entry.mood].label : undefined,
        tags: entry.tags,
      })),
    [journalEntries]
  );

  const renderWidget = (id: WidgetId): ReactNode => {
    // Instance (2nd arg WidgetGrid passes) isn't needed yet — every widget still renders
    // identically regardless of which instance it is (see WidgetInstance.config's own
    // comment). Only `type` (aliased `id` here, matching every case below) matters today.
    switch (id) {
      case 'hero':
        return <HeroCard label={mockHeroFocus.label} subtitle={heroSubtitle} />;
      case 'stats':
        return <StatsRow stats={liveStats} />;
      case 'tasks':
        return <TodaysTasks onAddTask={() => setTaskModalVisible(true)} />;
      case 'focusFlow':
        return <FocusFlow score={focusScore} activities={focusActivities} />;
      case 'quote':
        return <QuoteCard />;
      case 'quickActions':
        return <QuickActions actions={mockQuickActions} />;
      case 'recentActivity':
        return <RecentActivity entries={recentActivityEntries} />;
      case 'recentJournal':
        return <RecentJournal entries={recentJournalEntries} />;
      case 'insights':
        // The real Insights screen is Phase 7 — this is a placeholder widget, not a bug.
        return <EmptyState icon="BarChart3" title="Weekly Insights" description="Coming soon — trends across your time and mood." />;
      case 'habits':
        return <HabitTracker />;
      case 'time':
        return <TimeWidget />;
      case 'calendar':
        return <CalendarWidget />;
      case 'weather':
        return <WeatherWidget />;
      case 'weeklyProgress':
        return <WeeklyProgressWidget />;
      case 'streak':
        return <StreakWidget />;
      case 'todaysRoutine':
        return <TodaysRoutineWidget />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ProfileHeader />

        <ResponsiveContainer className="mt-6 gap-6">
          {isFreshStart && (
            <EmptyState
              icon="Sparkles"
              title="Welcome to TIDE"
              description="Start your first session to see your progress"
              actionLabel="Start Timer"
              onAction={() => router.push('/timer')}
              className="rounded-2xl border border-subtle bg-base py-10"
            />
          )}

          <QuestCard />

          <WidgetGrid widgets={visibleWidgets} renderWidget={renderWidget} />

          <Button
            title="Customize Dashboard"
            variant="secondary"
            icon="Settings"
            onPress={() => setCustomizeVisible(true)}
            className="mb-2 self-center"
          />
        </ResponsiveContainer>
      </ScrollView>

      <ChatbotFAB />

      <TaskFormModal visible={taskModalVisible} onClose={() => setTaskModalVisible(false)} />
      <CustomizeDashboardModal visible={customizeVisible} onClose={() => setCustomizeVisible(false)} />
    </SafeAreaView>
  );
}
