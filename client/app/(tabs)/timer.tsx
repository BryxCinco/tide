import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFormModal } from '@/components/activity';
import {
  ActivityBreakdown,
  ActivityPicker,
  CountdownMode,
  InterestTags,
  TimerControls,
  TimerDisplay,
  TodayLogs,
} from '@/components/timer';
import { BackButton, Button, Input, Modal, ResponsiveContainer, Text } from '@/components/ui';
import { useTimer } from '@/hooks/useTimer';
import { useActivityStore } from '@/store/activityStore';
import { DEFAULT_FOCUS_ACTIVITY } from '@/mocks/mockActivities';
import { INTEREST_TAGS } from '@/mocks/mockTimer';
import type { Activity } from '@/types/activity';
import { confirmAsync } from '@/utils/confirm';
import { formatDuration } from '@/utils/formatTime';
import { hapticNotification } from '@/utils/haptics';
import { soundManager } from '@/utils/soundManager';

const BREAK_DURATION_SECONDS = 5 * 60;

export default function TimerScreen() {
  const {
    currentActivity,
    selectedTags,
    notes,
    seconds,
    isRunning,
    isPaused,
    mode,
    countdownDurationSeconds,
    secondsRemaining,
    todaySessions,
    activityTotals,
    setActivity,
    clearActivity,
    toggleTag,
    setNotes,
    setMode,
    setCountdownDuration,
    start,
    pause,
    resume,
    stop,
    reset,
  } = useTimer();

  const allActivities = useActivityStore((s) => s.activities);
  // Focus Session is always offered as a pickable chip (not just an invisible fallback the
  // store reaches for) — prepended, not appended, so it reads as the default choice.
  const activities = useMemo(
    () => [DEFAULT_FOCUS_ACTIVITY, ...allActivities.filter((a) => !a.isArchived)],
    [allActivities],
  );
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const isSessionActive = isRunning || isPaused;

  const handleSelectActivity = async (activity: Activity) => {
    if (isSessionActive && currentActivity && activity.id !== currentActivity.id) {
      const confirmed = await confirmAsync(
        'Change activity?',
        `This session's time so far will be logged under "${activity.name}" instead of "${currentActivity.name}".`,
      );
      if (!confirmed) return;
    }
    setActivity(activity);
  };

  const status = isRunning ? 'running' : isPaused ? 'paused' : 'idle';
  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);

  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  // Guards the countdown-complete flow (sound/haptic/auto-save/modal) from firing more than
  // once per session — `seconds` can still tick past the target for one more interval
  // before `stop()`'s state update actually lands and resets it back to idle.
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (status === 'idle') hasCompletedRef.current = false;
  }, [status]);

  useEffect(() => {
    if (mode !== 'countdown' || !isRunning || !countdownDurationSeconds) return;
    if (seconds < countdownDurationSeconds || hasCompletedRef.current) return;

    hasCompletedRef.current = true;
    soundManager.play('timerComplete');
    hapticNotification();
    stop();
    setCompleteModalVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, mode, isRunning, countdownDurationSeconds]);

  const handleTap = () => {
    if (status === 'idle') start();
    else if (status === 'running') pause();
    else resume();
  };

  const handleDoubleTap = async () => {
    if (!isSessionActive) return;
    const confirmed = await confirmAsync('End this session?', `You've tracked ${formatDuration(seconds)}. Save this session?`);
    if (confirmed) stop();
  };

  const startBreak = () => {
    setCompleteModalVisible(false);
    // zustand's set() is synchronous, so start() below already sees these two updates —
    // no need to wait a tick for them to "land" first.
    setMode('countdown');
    setCountdownDuration(BREAK_DURATION_SECONDS);
    start();
  };

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

          <TimerDisplay
            seconds={seconds}
            status={status}
            activityLabel={currentActivity?.name}
            onTap={handleTap}
            onDoubleTap={handleDoubleTap}
            onReset={reset}
            countdownDurationSeconds={mode === 'countdown' ? (countdownDurationSeconds ?? undefined) : undefined}
            displaySeconds={mode === 'countdown' ? (secondsRemaining ?? undefined) : undefined}
          />

          {status === 'idle' && (
            <CountdownMode
              mode={mode}
              countdownDurationSeconds={countdownDurationSeconds}
              onModeChange={setMode}
              onDurationSelect={setCountdownDuration}
            />
          )}

          <ActivityPicker
            activities={activities}
            selectedId={currentActivity?.id}
            onSelect={handleSelectActivity}
            onDeselect={isSessionActive ? undefined : clearActivity}
            onAddCustom={isSessionActive ? undefined : () => setCustomModalVisible(true)}
          />

          <InterestTags tags={INTEREST_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />

          <Input
            label="Notes"
            placeholder="What are you working on?"
            value={notes}
            onChangeText={setNotes}
          />

          <TimerControls
            status={status}
            seconds={seconds}
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

      <Modal visible={completeModalVisible} onClose={() => setCompleteModalVisible(false)} title="Session Complete!" icon="PartyPopper" tone="accent" size="sm">
        <View className="gap-5">
          <Text variant="body" color="secondary">
            Your countdown session has been saved. Nice work.
          </Text>
          <View className="gap-2">
            <Button title="Take a 5-minute break?" variant="primary" size="lg" fullWidth icon="Coffee" onPress={startBreak} />
            <Button title="Done" variant="ghost" size="md" fullWidth onPress={() => setCompleteModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
