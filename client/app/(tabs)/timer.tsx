import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
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
import { BENTO_INK_TEXT, BentoHeader, BentoStat, BentoTile, Button, ErrorState, Icon, Input, Modal, ResponsiveContainer, SkeletonRow, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useTimer } from '@/hooks/useTimer';
import { useActivityStore } from '@/store/activityStore';
import { showToast } from '@/store/toastStore';
import { DEFAULT_FOCUS_ACTIVITY } from '@/mocks/mockActivities';
import { INTEREST_TAGS } from '@/mocks/mockTimer';
import { sessionService } from '@/services/session.service';
import type { Activity } from '@/types/activity';
import { hasAuthToken, isGuestMode } from '@/utils/authFlags';
import { confirmAsync } from '@/utils/confirm';
import { formatDuration } from '@/utils/formatTime';
import { hapticNotification } from '@/utils/haptics';
import { soundManager } from '@/utils/soundManager';

/** Weighted random pick for "Surprise Me" — activities not done in the last 7 days get 2x
 * the odds of one that was, so the suggestion leans toward what's been neglected instead of
 * being a flat coin flip. */
function pickSurpriseActivity(activities: Activity[], recentIds: Set<string>): Activity | undefined {
  if (activities.length === 0) return undefined;
  const weighted = activities.flatMap((activity) => Array(recentIds.has(activity.id) ? 1 : 2).fill(activity));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

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
    isLoading,
    error,
    fetchTodaySessions,
    clearError,
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

  const { isPhone } = useResponsive();
  const allActivities = useActivityStore((s) => s.activities);
  const activitiesLoading = useActivityStore((s) => s.isLoading);
  const fetchActivities = useActivityStore((s) => s.fetchActivities);
  // Focus Session is always offered as a pickable chip (not just an invisible fallback the
  // store reaches for) — prepended, not appended, so it reads as the default choice.
  const activities = useMemo(
    () => [DEFAULT_FOCUS_ACTIVITY, ...allActivities.filter((a) => !a.isArchived)],
    [allActivities],
  );
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Activity ids with a session in the last 7 days — "Surprise Me" weights against these so
  // it leans toward what's been neglected. Fetched once; a feature-only nicety, so a failure
  // (or guest mode, which has no backend to ask) just falls back to a flat random pick.
  const [recentActivityIds, setRecentActivityIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActivities();
    fetchTodaySessions();
    if (!isGuestMode() && hasAuthToken()) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sessionService
        .list({ from: sevenDaysAgo.toISOString() })
        .then((rows) => setRecentActivityIds(new Set(rows.map((r) => r.activity_id).filter((id): id is string => Boolean(id)))))
        .catch(() => {});
    }
    // Intentionally once on mount — re-fires only via pull-to-refresh below, not on every
    // render these functions get a new identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActivities(), fetchTodaySessions()]);
    setRefreshing(false);
  };

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

  const handleSurpriseMe = () => {
    const picked = pickSurpriseActivity(activities, recentActivityIds);
    if (!picked) return;
    handleSelectActivity(picked);
    showToast(`Try: ${picked.name}!`, 'success');
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24 pt-3 md:pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ResponsiveContainer className="gap-3 md:gap-4">
          {/* Header — left padding on phone clears AppLayout's floating menu button. */}
          <View className="flex-row items-center justify-between pl-12 md:pl-0">
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text variant="label" color="muted" style={{ letterSpacing: 1.4 }}>
                Focus
              </Text>
              <Text variant={isPhone ? 'h3' : 'h2'} color="primary" numberOfLines={2}>
                Deep work, one session at a time
              </Text>
            </View>
            {!isPhone && (
              <Button title="History" variant="ghost" size="sm" icon="History" onPress={() => router.push('/(tabs)/insights')} />
            )}
          </View>

          <View className="gap-3 md:flex-row md:gap-4">
            {/* STAGE — the ring, mode switch and controls. */}
            <BentoTile tone="glow" index={0} className="md:flex-[1.35]">
              <View className="flex-1 justify-between gap-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 rounded-full border border-subtle bg-base px-3 py-1.5">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: status === 'running' ? '#22C55E' : status === 'paused' ? '#F59E0B' : '#94A3B8' }}
                    />
                    <Text variant="body" color="secondary" className="text-[12px] font-semibold">
                      {status === 'running' ? 'In session' : status === 'paused' ? 'Paused' : 'Ready'}
                    </Text>
                  </View>
                  <Text variant="body" color="muted" className="text-[12px] font-medium">
                    {mode === 'countdown' ? 'Countdown' : 'Stopwatch'}
                  </Text>
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

                <TimerControls
                  status={status}
                  seconds={seconds}
                  onStart={start}
                  onPause={pause}
                  onResume={resume}
                  onConfirmStop={stop}
                />
              </View>
            </BentoTile>

            {/* SIDE COLUMN — today's numbers, what you're working on, tags & notes. */}
            <View className="gap-3 md:flex-1 md:gap-4">
              <View className="flex-row gap-3 md:gap-4">
                <BentoTile tone="ink" index={1} className="flex-1">
                  <View className="gap-3">
                    <Icon name="Hourglass" size={18} color="#5EEAD4" />
                    <View>
                      <Text variant="h2" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                        {formatDuration(todayTotalSeconds)}
                      </Text>
                      <Text variant="body" className="text-[12px] font-medium" style={{ color: BENTO_INK_TEXT.muted }}>
                        tracked today
                      </Text>
                    </View>
                  </View>
                </BentoTile>
                <BentoStat
                  className="flex-1"
                  index={2}
                  icon="Target"
                  color="#6366F1"
                  value={`${todaySessions.length}`}
                  label={todaySessions.length === 1 ? 'session today' : 'sessions today'}
                />
              </View>

              <BentoTile index={3}>
                <View className="gap-4">
                  <BentoHeader title="What are you focusing on?" icon="Layers" />
                  <ActivityPicker
                    compact={!isPhone}
                    activities={activities}
                    selectedId={currentActivity?.id}
                    onSelect={handleSelectActivity}
                    onDeselect={isSessionActive ? undefined : clearActivity}
                    onAddCustom={isSessionActive ? undefined : () => setCustomModalVisible(true)}
                    onShuffle={handleSurpriseMe}
                  />
                </View>
              </BentoTile>

              <BentoTile index={4}>
                <View className="gap-4">
                  <InterestTags tags={INTEREST_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
                  <Input label="Notes" placeholder="What are you working on?" value={notes} onChangeText={setNotes} />
                </View>
              </BentoTile>
            </View>
          </View>

          {error && todaySessions.length === 0 ? (
            <ErrorState
              message={error}
              onRetry={() => {
                clearError();
                fetchTodaySessions();
              }}
            />
          ) : (isLoading || activitiesLoading) && todaySessions.length === 0 ? (
            <View className="gap-2">
              {[0, 1].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </View>
          ) : (
            <View className="gap-3 md:flex-row md:gap-4">
              <View className="md:flex-[1.35]">
                <TodayLogs sessions={todaySessions} />
              </View>
              <View className="md:flex-1">
                <ActivityBreakdown activities={activities} totals={activityTotals} />
              </View>
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <ActivityFormModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onSaved={(created) => setActivity(created)}
        showSuccessModal={false}
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
