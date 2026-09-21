import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatbotFAB,
  FocusFlow,
  Header,
  HeroCard,
  QuickActions,
  RecentActivity,
  RecentJournal,
  StatsRow,
  TodaysTasks,
} from '@/components/dashboard';
import { TaskFormModal } from '@/components/tasks';
import { GuestBanner, ResponsiveContainer } from '@/components/ui';
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

const STAGGER_MS = 70;

export default function DashboardScreen() {
  const { user, isGuest } = useAuth();
  const [chatVisible, setChatVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8">
        <ResponsiveContainer className="gap-6">
          {isGuest && <GuestBanner onLinkPress={() => router.push('/(auth)/link-account')} />}

          <Animated.View entering={FadeInDown.duration(400)}>
            <Header name={user?.name ?? 'there'} avatarSource={user?.avatar} hasUnreadNotifications />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS).duration(400)}>
            <HeroCard label={mockHeroFocus.label} subtitle={mockHeroFocus.subtitle} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).duration(400)}>
            <StatsRow stats={mockStats} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 3).duration(400)}>
            <FocusFlow score={mockFocusScore} activities={mockFocusActivities} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 4).duration(400)}>
            <TodaysTasks onAddTask={() => setTaskModalVisible(true)} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 5).duration(400)}>
            <QuickActions actions={mockQuickActions} onChatPress={() => setChatVisible(true)} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 6).duration(400)}>
            <RecentActivity entries={mockRecentActivity} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 7).duration(400)}>
            <RecentJournal entries={mockRecentJournal} />
          </Animated.View>
        </ResponsiveContainer>
      </ScrollView>

      <ChatbotFAB
        userName={user?.name}
        visible={chatVisible}
        onOpen={() => setChatVisible(true)}
        onClose={() => setChatVisible(false)}
      />

      <TaskFormModal visible={taskModalVisible} onClose={() => setTaskModalVisible(false)} />
    </SafeAreaView>
  );
}
