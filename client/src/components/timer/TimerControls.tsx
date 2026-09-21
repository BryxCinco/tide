import { useState } from 'react';
import { View } from 'react-native';

import { formatDuration } from '../../utils/formatTime';
import { Button, Modal, Text } from '../ui';
import type { TimerRingStatus } from './CircularTimer';

export interface TimerControlsProps {
  status: TimerRingStatus;
  seconds: number;
  /** Whether an activity has been picked yet — gates the idle "Start Session" button. */
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  /** Called after the user confirms in the "End this session?" modal. */
  onConfirmStop: () => void;
}

export function TimerControls({
  status,
  seconds,
  canStart,
  onStart,
  onPause,
  onResume,
  onConfirmStop,
}: TimerControlsProps) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleSave = () => {
    setConfirmVisible(false);
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
        disabled={!canStart}
        onPress={onStart}
      />
    );
  }

  return (
    <>
      <View className="flex-row gap-3">
        {status === 'running' ? (
          <Button title="Pause" variant="secondary" size="lg" icon="Pause" onPress={onPause} className="flex-1" />
        ) : (
          <Button title="Resume" variant="primary" size="lg" icon="Play" onPress={onResume} className="flex-1" />
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

      <Modal visible={confirmVisible} onClose={() => setConfirmVisible(false)} title="End this session?" size="sm">
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
