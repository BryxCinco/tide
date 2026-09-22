import { useState } from 'react';
import { View } from 'react-native';

import { formatDuration } from '../../utils/formatTime';
import { soundManager } from '../../utils/soundManager';
import { Button, Modal, Text } from '../ui';
import type { TimerRingStatus } from './CircularTimer';

export interface TimerControlsProps {
  status: TimerRingStatus;
  seconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  /** Called after the user confirms in the "End this session?" modal. */
  onConfirmStop: () => void;
}

export function TimerControls({
  status,
  seconds,
  onStart,
  onPause,
  onResume,
  onConfirmStop,
}: TimerControlsProps) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleStart = () => {
    soundManager.play('timerStart');
    onStart();
  };

  const handlePause = () => {
    soundManager.play('timerPause');
    onPause();
  };

  const handleResume = () => {
    soundManager.play('timerStart');
    onResume();
  };

  const handleSave = () => {
    setConfirmVisible(false);
    // This app's Timer is a stopwatch with no duration goal to "complete", so unlike
    // start/pause there's no natural place for the more prominent `timerComplete` alarm —
    // it stays implemented in soundManager.ts (`RECIPES.timerComplete`) and ready to wire
    // up if a Pomodoro-style countdown target is ever added. Saving a finished session is
    // this screen's real "stop" moment, so it gets `timerStop`.
    soundManager.play('timerStop');
    onConfirmStop();
  };

  if (status === 'idle') {
    return (
      <Button
        title="Start Session"
        variant="primary"
        size="lg"
        fullWidth
        icon="Play"
        onPress={handleStart}
      />
    );
  }

  return (
    <>
      <View className="flex-row gap-3">
        {status === 'running' ? (
          <Button title="Pause" variant="secondary" size="lg" icon="Pause" onPress={handlePause} className="flex-1" />
        ) : (
          <Button title="Resume" variant="primary" size="lg" icon="Play" onPress={handleResume} className="flex-1" />
        )}
        <Button
          title="Stop"
          variant="danger"
          size="lg"
          icon="Square"
          onPress={() => setConfirmVisible(true)}
          className="flex-1"
        />
      </View>

      <Modal visible={confirmVisible} onClose={() => setConfirmVisible(false)} title="End this session?" icon="Clock" size="sm">
        <Text variant="body" color="secondary" className="mb-6">
          You&apos;ve tracked {formatDuration(seconds)}. Save this session?
        </Text>
        <View className="flex-row gap-3">
          <Button title="Cancel" variant="ghost" onPress={() => setConfirmVisible(false)} className="flex-1" />
          <Button title="Save Session" variant="primary" onPress={handleSave} className="flex-1" />
        </View>
      </Modal>
    </>
  );
}
