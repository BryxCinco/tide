import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatbotFAB,
  CustomizeDashboardModal,
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
import { TaskFormModal } from '@/components/tasks';
import { Button, EmptyState, GuestBanner, ResponsiveContainer } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  mockFocusActivities,
  mockFocusScore,
  mockHeroFocus,
  mockQuickActions,
  mockRecentActivity,
  mockRecentJournal,
  mockStats,
} from '@/mocks/mockDashboard';
import { getVisibleWidgets, useDashboardStore } from '@/store/dashboardStore';
import type { WidgetId } from '@/types/dashboard';

export default function DashboardScreen() {
  const { user, isGuest } = useAuth();
  const [chatVisible, setChatVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [customizeVisible, setCustomizeVisible] = useState(false);

  const allWidgets = useDashboardStore((s) => s.preferences.widgets);
  const visibleWidgets = useMemo(() => getVisibleWidgets(allWidgets), [allWidgets]);

  const renderWidget = (id: WidgetId): ReactNode => {
    switch (id) {
      case 'hero':
        return <HeroCard label={mockHeroFocus.label} subtitle={mockHeroFocus.subtitle} />;
      case 'stats':
        return <StatsRow stats={mockStats} />;
      case 'tasks':
        return <TodaysTasks onAddTask={() => setTaskModalVisible(true)} />;
      case 'focusFlow':
        return <FocusFlow score={mockFocusScore} activities={mockFocusActivities} />;
      case 'quote':
        return <QuoteCard />;
      case 'quickActions':
        return <QuickActions actions={mockQuickActions} onChatPress={() => setChatVisible(true)} />;
      case 'recentActivity':
        return <RecentActivity entries={mockRecentActivity} />;
      case 'recentJournal':
        return <RecentJournal entries={mockRecentJournal} />;
      case 'insights':
        // The real Insights screen is Phase 7 — this is a placeholder widget, not a bug.
        return <EmptyState icon="BarChart3" title="Weekly Insights" description="Coming soon — trends across your time and mood." />;
      case 'habits':
        return <HabitTracker />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        {isGuest && (
          <ResponsiveContainer className="pt-4 md:pt-6 lg:pt-8">
            <GuestBanner onLinkPress={() => router.push('/(auth)/link-account')} />
          </ResponsiveContainer>
        )}

        <ProfileHeader />

        <ResponsiveContainer className="mt-6 gap-6">
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

      <ChatbotFAB
        userName={user?.name}
        visible={chatVisible}
        onOpen={() => setChatVisible(true)}
        onClose={() => setChatVisible(false)}
      />

      <TaskFormModal visible={taskModalVisible} onClose={() => setTaskModalVisible(false)} />
      <CustomizeDashboardModal visible={customizeVisible} onClose={() => setCustomizeVisible(false)} />
    </SafeAreaView>
  );
}
