import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { AccentTone, StatItem } from '../../types/dashboard';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Text } from '../ui';

// 'muted' has no explicit icon color — Icon's own default already resolves to the
// theme-reactive muted tone, so omitting it here (rather than a static light-mode hex)
// keeps it correct in dark mode too.
const tintClasses: Record<AccentTone, { bg: string; icon?: string }> = {
  teal: { bg: 'bg-tide-teal/10', icon: colors.brand.tideTeal },
  blue: { bg: 'bg-ocean-blue/10', icon: colors.brand.oceanBlue },
  purple: { bg: 'bg-deep-purple/10', icon: colors.brand.deepPurple },
  muted: { bg: 'bg-hover' },
  red: { bg: 'bg-error/10', icon: colors.status.error },
};

/** Plain rAF counter (not Reanimated) — animating Text *content* doesn't need worklets, and this avoids Reanimated's text-prop edge cases entirely. */
function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = Date.now();

    function tick() {
      const progress = Math.min(1, (Date.now() - start) / durationMs);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

/** "12 days" -> animate "12" up to itself, keep " days" static. Values with no leading integer ("Productive") render as-is. */
function useAnimatedStatValue(value: string): string {
  const match = value.match(/^(\d+)(.*)$/);
  const animated = useCountUp(match ? Number(match[1]) : 0);
  return match ? `${animated}${match[2]}` : value;
}

function StatCard({ stat }: { stat: StatItem }) {
  const tone = tintClasses[stat.tint];
  const displayValue = useAnimatedStatValue(stat.value);

  return (
    <View
      className={cn(
        'gap-3 rounded-xl border border-subtle bg-elevated p-4',
        'basis-[47%] md:basis-0 md:min-w-[140px] md:flex-1',
        'hover:shadow-md',
      )}
    >
      <View className={cn('h-10 w-10 items-center justify-center rounded-full', tone.bg)}>
        <Icon name={stat.icon} size={18} color={tone.icon} />
      </View>

      <View>
        <Text variant="h2" color="primary">
          {displayValue}
        </Text>
        <Text variant="caption" color="muted" className="mt-0.5">
          {stat.label}
        </Text>
      </View>

      {stat.trend && (
        <Text variant="caption" color="accent" className="normal-case tracking-normal">
          {stat.trend}
        </Text>
      )}
    </View>
  );
}

export interface StatsRowProps {
  stats: StatItem[];
}

/** 2x2 on phone, 4-across from tablet (md, 768px+) up. */
export function StatsRow({ stats }: StatsRowProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </View>
  );
}
