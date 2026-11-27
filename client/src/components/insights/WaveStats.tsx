import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { insightsService } from '../../services/insights.service';
import type { WaveDay } from '../../types/insights';
import { cn } from '../../utils/cn';
import { toDateKey } from '../../utils/formatDate';
import { formatDuration } from '../../utils/formatTime';
import { averageLevel } from '../../utils/waves';
import { BENTO_INK_TEXT, BentoTile, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { WAVE_META, WaveGlyph } from './WaveGlyph';

export interface WaveStatsProps {
  /** Bump to refetch (pull-to-refresh). */
  refreshKey?: number;
  index?: number;
  className?: string;
}

const PLACEHOLDER: WaveDay[] = Array.from({ length: 7 }, (_, i) => ({
  date: `p${i}`, label: '', score: 0, level: 'low', focusSeconds: 0, tasks: 0, quests: 0, journal: 0, activities: 0,
}));

function breakdown(day: WaveDay): string {
  const parts = [
    day.focusSeconds > 0 ? `${formatDuration(day.focusSeconds)} focus` : null,
    day.tasks ? `${day.tasks} ${day.tasks === 1 ? 'task' : 'tasks'}` : null,
    day.quests ? `${day.quests} ${day.quests === 1 ? 'quest' : 'quests'}` : null,
    day.journal ? 'journaled' : null,
    day.activities ? `${day.activities} ${day.activities === 1 ? 'activity' : 'activities'}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'A calm day — nothing logged';
}

/**
 * Wave Stats: the last 7 local days as waves — Low, Mid, High or Tsunami — scored from focus
 * time, tasks, quests, journaling and activities (server/lib/waves.js). Hides itself when the
 * data can't load (e.g. demo mode), so it never breaks the page it sits on.
 */
export function WaveStats({ refreshKey = 0, index = 0, className }: WaveStatsProps) {
  const [days, setDays] = useState<WaveDay[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const todayKey = toDateKey(new Date());
  const { isPhone } = useResponsive();

  useEffect(() => {
    let alive = true;
    insightsService
      .getWaves(7, todayKey)
      .then((waves) => alive && (setDays(waves), setFailed(false)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [refreshKey, todayKey]);

  if (failed) return null;

  const loading = days === null;
  const list = days ?? PLACEHOLDER;
  const avg = averageLevel(loading ? [] : list);
  const avgMeta = WAVE_META[avg.level];
  const active = list.find((d) => d.date === (selected ?? todayKey)) ?? list[list.length - 1];

  return (
    <BentoTile tone="deep" dense index={index} className={className}>
      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <View className="flex-row items-center gap-1.5">
            <Icon name="Waves" size={14} color={avgMeta.color === '#94A3B8' ? BENTO_INK_TEXT.secondary : avgMeta.color} strokeWidth={2.2} />
            <Text variant="label" className="text-[10.5px]" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 0.8 }}>
              Wave stats · last 7 days
            </Text>
          </View>
          {!loading && (
            <View className="flex-row items-baseline gap-1.5">
              <Text variant="body" className="text-[12px]" style={{ color: BENTO_INK_TEXT.muted }}>
                {isPhone ? 'Week' : "This week's tide"}
              </Text>
              <Text variant="body" className="text-[14px] font-bold" style={{ color: avg.level === 'low' ? BENTO_INK_TEXT.primary : avgMeta.color }}>
                {avgMeta.label} · {avg.score}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row justify-between gap-1">
          {list.map((day) => {
            const isToday = day.date === todayKey;
            const isActive = !loading && day.date === active.date;
            return (
              <Pressable
                key={day.date}
                disabled={loading}
                onPress={() => setSelected(day.date)}
                onHoverIn={() => setSelected(day.date)}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Loading' : `${day.label}: ${WAVE_META[day.level].label}, score ${day.score}`}
                className={cn('flex-1 items-center gap-1 rounded-2xl py-1.5', isActive && 'bg-[rgba(255,255,255,0.07)]')}
              >
                <WaveGlyph level={day.level} size={isPhone ? 38 : 56} dim={loading} />
                <Text variant="body" className={cn('text-[11px]', isToday ? 'font-bold' : 'font-medium')} style={{ color: isToday ? BENTO_INK_TEXT.primary : BENTO_INK_TEXT.secondary }}>
                  {loading ? ' ' : isToday ? 'Today' : day.label}
                </Text>
                <Text variant="body" className={cn('font-semibold', isPhone ? 'text-[9px]' : 'text-[10px]')} numberOfLines={1} style={{ color: day.level === 'low' ? BENTO_INK_TEXT.muted : WAVE_META[day.level].color }}>
                  {loading ? ' ' : WAVE_META[day.level].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="min-h-[18px] flex-row items-center gap-2 border-t pt-2.5" style={{ borderColor: BENTO_INK_TEXT.hairline }}>
          {!loading && (
            <>
              <Text variant="body" className="text-[12px] font-semibold" style={{ color: BENTO_INK_TEXT.primary }}>
                {active.date === todayKey ? 'Today' : active.label} · {active.score}
              </Text>
              <Text variant="body" className="flex-1 text-[12px]" style={{ color: BENTO_INK_TEXT.secondary }} numberOfLines={1}>
                {breakdown(active)}
              </Text>
            </>
          )}
        </View>
      </View>
    </BentoTile>
  );
}
