import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatbotFAB,
  CustomizeDashboardModal,
  DailyQuestCard,
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
import { CalendarWidget, StreakWidget, TimeWidget, WeatherWidget, WeeklyProgressWidget } from '@/components/dashboard/widgets';
import { TaskFormModal } from '@/components/tasks';
import { Button, EmptyState, GuestBanner, ResponsiveContainer } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { mockFocusActivities, mockFocusScore, mockHeroFocus, mockQuickActions } from '@/mocks/mockDashboard';
import { getVisibleWidgets, useDashboardStore } from '@/store/dashboardStore';
import { useJournalStore } from '@/store/journalStore';
import { useQuestStore } from '@/store/questStore';
import { useStreakStore } from '@/store/streakStore';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import type { StatItem, WidgetId } from '@/types/dashboard';
import { formatDuration } from '@/utils/formatTime';

export default function DashboardScreen() {
  const { isGuest } = useAuth();
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
  const journalCount = useJournalStore((s) => s.entries.length);
  const streak = useQuestStore((s) => s.streak);

  // DailyQuestCard fetches today's quests itself on its own mount (it's reused on both the
  // Dashboard and Tasks screen) — calling fetchTodayQuests again here would just be a
  // redundant duplicate request, so it's deliberately left out of this effect.
  useEffect(() => {
    fetchTodaySessions();
    fetchTasks();
    fetchStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodaySessions(), fetchTasks(), fetchStreak()]);
    setRefreshing(false);
  };

  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);
  const openTasksCount = tasks.filter((t) => t.status !== 'done').length;
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
  ];

  const heroSubtitle = todaySessions.length > 0 ? `${formatDuration(todayTotalSeconds)} tracked today` : mockHeroFocus.subtitle;

  const renderWidget = (id: WidgetId): ReactNode => {
    switch (id) {
      case 'hero':
        return <HeroCard label={mockHeroFocus.label} subtitle={heroSubtitle} />;
      case 'stats':
        return <StatsRow stats={liveStats} />;
      case 'tasks':
        return <TodaysTasks onAddTask={() => setTaskModalVisible(true)} />;
      case 'focusFlow':
        return <FocusFlow score={mockFocusScore} activities={mockFocusActivities} />;
      case 'quote':
        return <QuoteCard />;
      case 'quickActions':
        return <QuickActions actions={mockQuickActions} />;
      case 'recentActivity':
        return <RecentActivity entries={[]} />;
      case 'recentJournal':
        return <RecentJournal entries={[]} />;
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
        {isGuest && (
          <ResponsiveContainer className="pt-4 md:pt-6 lg:pt-8">
            <GuestBanner onLinkPress={() => router.push('/(auth)/link-account')} />
          </ResponsiveContainer>
        )}

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

          <DailyQuestCard />

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
