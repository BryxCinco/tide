import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { TimerMode } from '../../store/timerStore';
import { cn } from '../../utils/cn';
import { Text } from '../ui';
import { DurationPicker } from './DurationPicker';

export interface CountdownModeProps {
  mode: TimerMode;
  countdownDurationSeconds: number | null;
  onModeChange: (mode: TimerMode) => void;
  onDurationSelect: (seconds: number) => void;
}

/** Stopwatch/Countdown mode toggle + (when Countdown is picked) the duration picker below
 * it — only rendered on the idle Timer screen, since switching mode or duration mid-session
 * doesn't mean anything (timerStore.setMode already no-ops while running/paused as a
 * safety net, matching this). */
export function CountdownMode({ mode, countdownDurationSeconds, onModeChange, onDurationSelect }: CountdownModeProps) {
  return (
    <View className="gap-3">
      <View className="w-full flex-row self-center rounded-full border border-subtle bg-elevated p-1 md:w-auto md:self-center">
        {(['stopwatch', 'countdown'] as const).map((option) => {
          const selected = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => onModeChange(option)}
              className={cn('flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-5 py-2 md:flex-none', selected && (option === 'countdown' ? 'bg-deep-purple' : 'bg-tide-teal'))}
            >
              <Text variant="body" color={selected ? 'inverse' : 'secondary'} className={cn('normal-case tracking-normal', selected && 'font-semibold')}>
                {option === 'stopwatch' ? 'Stopwatch' : 'Countdown'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'countdown' && <DurationPicker value={countdownDurationSeconds} onSelect={onDurationSelect} />}
    </View>
  );
}
