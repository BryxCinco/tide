import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useSettingsStore } from '../../../store/settingsStore';
import { Card, Icon, Text } from '../../ui';

/** IANA zone name (e.g. "Asia/Manila") — there's no free-text "friendly" timezone name
 * without a lookup table, and this is at least always accurate for wherever the device
 * actually is. */
function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

/** Big live-updating clock + date + timezone tile. Ticks once a minute (not once a
 * second, unlike the Timer's stopwatch) — a clock that shows minutes has nothing to gain
 * from a faster interval and it would just be 60x the unnecessary re-renders. */
export function TimeWidget() {
  const timeFormat = useSettingsStore((s) => s.settings.timeFormat);
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // First tick is aligned to the next real minute boundary (not "60s from mount"), so
    // the displayed minute never sits stale for up to 59s after mounting.
    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      setNow(new Date());
      intervalRef.current = setInterval(() => setNow(new Date()), 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const timeLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Card variant="default" padding="md" className="rounded-[24px] min-h-[150px] gap-1">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {currentTimeZone()}
        </Text>
        <Icon name="Clock" size={15} color="#14B8A6" />
      </View>
      <Text variant="h1" color="primary" className="mt-2 font-bold" style={{ fontSize: 32 }}>
        {timeLabel}
      </Text>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {dateLabel}
      </Text>
    </Card>
  );
}
