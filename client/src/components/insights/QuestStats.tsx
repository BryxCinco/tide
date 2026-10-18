import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { QUEST_CATEGORY_COLOR, QUEST_CATEGORY_ICON, QUEST_CATEGORY_LABEL, QUEST_TIER_META, type QuestCategory, type QuestTier } from '../../types/quest';
import type { QuestInsights } from '../../types/insights';
import { hexToRgba } from '../../utils/color';
import { toDateKey } from '../../utils/formatDate';
import { BentoRing, Icon, Text, type IconName } from '../ui';
import { useChartTheme } from './chartTheme';

export interface QuestStatsProps {
  data: QuestInsights;
}

/** Quests' own hue across this card — the violet the Quest card already uses for Epic. */
const QUEST_ACCENT = '#8B5CF6';

function MiniStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View className="basis-[30%] grow gap-1.5 rounded-2xl border border-subtle bg-base p-3">
      <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(QUEST_ACCENT, 0.12) }}>
        <Icon name={icon} size={14} color={QUEST_ACCENT} />
      </View>
      <Text variant="h3" color="primary" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="body" color="muted" className="text-[11px] leading-[14px]" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Completed out of issued, per day: a soft track column for the day's total quests with the
 * completed part filled from the baseline. Tap/hover a day to read its exact numbers. */
function QuestDayBars({ days }: { days: QuestInsights['byDay'] }) {
  const theme = useChartTheme();
  const [active, setActive] = useState<string | null>(null);
  const height = 88;
  const max = Math.max(...days.map((d) => d.total), 1);
  const todayKey = toDateKey(new Date());
  const dense = days.length > 14;
  const activeDay = days.find((d) => d.date === active);

  return (
    <View className="gap-2">
      <Text variant="body" color="muted" className="text-[12px]" style={{ fontVariant: ['tabular-nums'] }}>
        {activeDay
          ? `${new Date(`${activeDay.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${activeDay.completed} of ${activeDay.total} done`
          : 'Completed of issued, per day'}
      </Text>
      <View className="flex-row items-end" style={{ height, gap: dense ? 2 : 8 }}>
        {days.map((day) => {
          const trackH = day.total > 0 ? Math.max((day.total / max) * height, 4) : 2;
          const fillH = day.total > 0 ? (day.completed / max) * height : 0;
          const isActive = active === day.date;
          return (
            <Pressable
              key={day.date}
              onPress={() => setActive(isActive ? null : day.date)}
              onHoverIn={() => setActive(day.date)}
              onHoverOut={() => setActive(null)}
              className="flex-1 items-center justify-end"
              style={{ height }}
              accessibilityLabel={`${day.date}: ${day.completed} of ${day.total} quests completed`}
            >
              <View
                style={{
                  width: '100%',
                  maxWidth: 22,
                  height: trackH,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: theme.track,
                  justifyContent: 'flex-end',
                  overflow: 'hidden',
                  opacity: active && !isActive ? 0.55 : 1,
                }}
              >
                {fillH > 0 && (
                  <View
                    style={{
                      height: fillH,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      backgroundColor: day.date === todayKey || isActive ? QUEST_ACCENT : hexToRgba(QUEST_ACCENT, 0.6),
                    }}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: theme.grid }} />
      {!dense && (
        <View className="flex-row" style={{ gap: 8 }}>
          {days.map((day) => (
            <View key={day.date} className="flex-1 items-center">
              <Text
                variant="body"
                color={day.date === todayKey ? 'primary' : 'muted'}
                className={day.date === todayKey ? 'font-semibold' : undefined}
                style={{ fontSize: 11 }}
              >
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Each category's completed/issued as a labelled meter in that category's own color. */
function CategoryMeters({ categories }: { categories: QuestInsights['byCategory'] }) {
  const theme = useChartTheme();
  return (
    <View className="gap-3">
      {categories.map((c) => {
        const key = (c.category in QUEST_CATEGORY_LABEL ? c.category : 'growth') as QuestCategory;
        const color = QUEST_CATEGORY_COLOR[key];
        const pct = c.total > 0 ? (c.completed / c.total) * 100 : 0;
        return (
          <View key={c.category} className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Icon name={QUEST_CATEGORY_ICON[key] as IconName} size={13} color={color} />
              <Text variant="body" color="secondary" className="flex-1 text-[13px] font-medium">
                {QUEST_CATEGORY_LABEL[key]}
              </Text>
              <Text variant="body" color="primary" className="text-[12px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                {c.completed}/{c.total}
              </Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.track }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Tide's Quests for the selected period: completion ring, XP and perfect days, completed vs
 * issued per day, and which categories and tiers got done. Server-computed (see
 * insightsService.js's getQuestStats).
 */
export function QuestStats({ data }: QuestStatsProps) {
  const theme = useChartTheme();

  if (data.total === 0) {
    return (
      <View className="items-center gap-2 py-8">
        <Icon name="Swords" size={22} color={QUEST_ACCENT} />
        <Text variant="body" color="muted" className="text-center text-[13px]">
          No quests in this period yet. Complete Tide&apos;s Quests on the Dashboard to see them here.
        </Text>
      </View>
    );
  }

  const tiers = data.byTier.filter((t) => t.completed > 0);

  return (
    <View className="gap-5">
      <View className="gap-4 md:flex-row md:items-center">
        <View className="flex-row items-center gap-4 md:flex-[0.9]">
          <BentoRing value={data.completionRate} size={104} strokeWidth={10} trackColor={theme.track}>
            <Text variant="h2" color="primary">
              {data.completionRate}%
            </Text>
            <Text variant="body" color="muted" className="text-[11px]">
              done
            </Text>
          </BentoRing>
          <View className="flex-1 gap-1" style={{ minWidth: 0 }}>
            <Text variant="h3" color="primary">
              {data.completed} of {data.total} quests
            </Text>
            <Text variant="body" color="muted" className="text-[12px] leading-[17px]">
              Completed out of every quest issued in this period.
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2.5 md:flex-1">
          <MiniStat icon="Sparkles" value={`${data.xpEarned}`} label="XP earned" />
          <MiniStat icon="Crown" value={`${data.perfectDays}`} label={data.perfectDays === 1 ? 'perfect day' : 'perfect days'} />
          <MiniStat icon="CheckCircle2" value={`${data.completed}`} label="completed" />
        </View>
      </View>

      <View className="gap-5 lg:flex-row lg:gap-6">
        <View className="lg:flex-[1.4]">
          <QuestDayBars days={data.byDay} />
        </View>
        <View className="gap-4 lg:flex-1">
          <CategoryMeters categories={data.byCategory} />
          {tiers.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {tiers.map((t) => {
                const meta = QUEST_TIER_META[t.tier as QuestTier];
                return (
                  <View key={t.tier} className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: hexToRgba(meta.color, 0.12) }}>
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <Text variant="body" color="secondary" className="text-[11px] font-semibold">
                      {meta.name} · {t.completed}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
