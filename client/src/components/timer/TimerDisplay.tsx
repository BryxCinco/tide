import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { CircularTimer, type TimerRingStatus } from './CircularTimer';

export interface TimerDisplayProps {
  seconds: number;
  status: TimerRingStatus;
  activityLabel?: string;
}

/** Centers CircularTimer and sizes it per breakpoint: 240 phone / 280 tablet / 320 desktop. */
export function TimerDisplay({ seconds, status, activityLabel }: TimerDisplayProps) {
  const { isPhone, isTablet } = useResponsive();
  const size = isPhone ? 240 : isTablet ? 280 : 320;

  return (
    <View className="items-center py-4">
      <CircularTimer seconds={seconds} status={status} activityLabel={activityLabel} size={size} />
    </View>
  );
}
