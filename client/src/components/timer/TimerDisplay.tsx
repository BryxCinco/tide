import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { Haptics, hapticImpact } from '../../utils/haptics';
import { Button, Modal, Text } from '../ui';
import { CircularTimer, type TimerRingStatus } from './CircularTimer';

export interface TimerDisplayProps {
  seconds: number;
  status: TimerRingStatus;
  activityLabel?: string;
  /** Fix 7: tap the ring to start/pause/resume; double-tap to stop+save. */
  onTap: () => void;
  onDoubleTap: () => void;
  /** Long-press while running/paused opens a small "Reset" menu — omitted (menu doesn't
   * render) while idle, since there's nothing to reset yet. */
  onReset?: () => void;
  countdownDurationSeconds?: number;
  displaySeconds?: number;
}

const DOUBLE_TAP_WINDOW_MS = 300;

/** Centers CircularTimer and sizes it per breakpoint: 240 phone / 280 tablet / 320 desktop.
 * Owns the tap/double-tap/long-press gesture disambiguation (Fix 7) — RN's Pressable has
 * onPress/onLongPress but no built-in double-tap, so a single tap is held for
 * DOUBLE_TAP_WINDOW_MS before firing, in case a second tap arrives and promotes it to a
 * double-tap instead. */
export function TimerDisplay({ seconds, status, activityLabel, onTap, onDoubleTap, onReset, countdownDurationSeconds, displaySeconds }: TimerDisplayProps) {
  const { isPhone, isTablet } = useResponsive();
  const size = isPhone ? 240 : isTablet ? 280 : 320;
  const [resetMenuVisible, setResetMenuVisible] = useState(false);

  const lastTapAt = useRef(0);
  const pendingTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_WINDOW_MS) {
      if (pendingTapTimeout.current) clearTimeout(pendingTapTimeout.current);
      lastTapAt.current = 0;
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      onDoubleTap();
      return;
    }
    lastTapAt.current = now;
    pendingTapTimeout.current = setTimeout(() => {
      hapticImpact(status === 'idle' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      onTap();
    }, DOUBLE_TAP_WINDOW_MS);
  };

  const handleLongPress = () => {
    if (status === 'idle') return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setResetMenuVisible(true);
  };

  return (
    <View className="items-center py-4">
      <Pressable onPress={handlePress} onLongPress={handleLongPress} hitSlop={12}>
        <CircularTimer
          seconds={seconds}
          status={status}
          activityLabel={activityLabel}
          size={size}
          countdownDurationSeconds={countdownDurationSeconds}
          displaySeconds={displaySeconds}
        />
      </Pressable>
      <Text variant="caption" color="muted" className="mt-3 normal-case tracking-normal">
        {status === 'idle' ? 'Tap to start' : status === 'running' ? 'Tap to pause · double-tap to stop' : 'Tap to resume · double-tap to stop'}
      </Text>

      <Modal visible={resetMenuVisible} onClose={() => setResetMenuVisible(false)} title="Timer Options" icon="RotateCcw" size="sm">
        <View className="gap-3">
          <Button
            title="Reset"
            variant="danger"
            size="lg"
            fullWidth
            icon="RotateCcw"
            onPress={() => {
              onReset?.();
              setResetMenuVisible(false);
            }}
          />
          <Button title="Cancel" variant="ghost" size="md" fullWidth onPress={() => setResetMenuVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}
