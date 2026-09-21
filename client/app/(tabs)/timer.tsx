import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFormModal } from '@/components/activity';
import {
  ActivityBreakdown,
  ActivityPicker,
  InterestTags,
  TimerControls,
  TimerDisplay,
  TodayLogs,
} from '@/components/timer';
import { BackButton, Button, Input, ResponsiveContainer, Text } from '@/components/ui';
import { useTimer } from '@/hooks/useTimer';
import { useActivityStore } from '@/store/activityStore';
import { INTEREST_TAGS } from '@/mocks/mockTimer';
import { formatDuration } from '@/utils/formatTime';

export default function TimerScreen() {
  const {
    currentActivity,
    selectedTags,
    notes,
    seconds,
    isRunning,
    isPaused,
    todaySessions,
    activityTotals,
    setActivity,
    toggleTag,
    setNotes,
    start,
    pause,
    resume,
    stop,
  } = useTimer();

  const allActivities = useActivityStore((s) => s.activities);
  const activities = allActivities.filter((a) => !a.isArchived);
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const status = isRunning ? 'running' : isPaused ? 'paused' : 'idle';
  const isSessionActive = isRunning || isPaused;
  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8">
        <ResponsiveContainer className="gap-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <BackButton onPress={() => router.push('/')} />
              <View>
                <Text variant="h2" color="primary">
                  Focus Timer
                </Text>
                <Text variant="caption" color="muted" className="mt-1 normal-case tracking-normal">
                  {formatDuration(todayTotalSeconds)} tracked today
                </Text>
              </View>
            </View>
            <Button title="History" variant="ghost" size="sm" onPress={() => router.push('/(tabs)/insights')} />
          </View>

          <TimerDisplay seconds={seconds} status={status} activityLabel={currentActivity?.name} />

          <ActivityPicker
            activities={activities}
            selectedId={currentActivity?.id}
            onSelect={setActivity}
            disabled={isSessionActive}
            onAddCustom={isSessionActive ? undefined : () => setCustomModalVisible(true)}
          />

          <InterestTags tags={INTEREST_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />

          <Input
            label="Notes"
            placeholder="What are you working on?"
            value={notes}
            onChangeText={setNotes}
            editable={isSessionActive}
          />

          <TimerControls
            status={status}
            seconds={seconds}
            canStart={Boolean(currentActivity)}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onConfirmStop={stop}
          />

          <TodayLogs sessions={todaySessions} />

          <ActivityBreakdown activities={activities} totals={activityTotals} />
        </ResponsiveContainer>
      </ScrollView>

      <ActivityFormModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onSaved={(created) => setActivity(created)}
      />
    </SafeAreaView>
  );
}
