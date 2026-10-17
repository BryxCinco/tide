import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { MOOD_ICON_MAP } from '../journal/MoodIcon';
import type { Mood } from '../../types/journal';
import type { MoodTrendPoint } from '../../types/insights';
import { EmptyState, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { useChartTheme } from './chartTheme';

export interface MoodTrendProps {
  data: MoodTrendPoint[];
  height?: number;
  /** Shows the latest recorded mood in the readout line when nothing is hovered. */
  showCurrentMood?: boolean;
}

const MIN_SCORE = 1;
const MAX_SCORE = 5;
const Y_AXIS_WIDTH = 26;
const PAD = 8;
const MOOD_BY_SCORE: Record<number, Mood> = { 1: 'terrible', 2: 'bad', 3: 'okay', 4: 'good', 5: 'great' };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Smooth curve through the points via quadratic Beziers anchored at segment midpoints. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    d += ` Q ${prev.x} ${prev.y} ${(prev.x + curr.x) / 2} ${(prev.y + curr.y) / 2}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/**
 * Mood over the window: mood icons as the y axis with a hairline per level, a 2px smooth
 * line with a soft wash beneath it, and 8px dots ringed in the surface color. Days without
 * a journal entry break the line rather than inventing a mood. Hover (web) or tap shows
 * that day in the readout line above the plot.
 */
export function MoodTrend({ data, height = 150, showCurrentMood = true }: MoodTrendProps) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasAnyData = data.some((p) => p.score != null);
  if (!hasAnyData) {
    return <EmptyState icon="Smile" title="No mood data yet" description="Pick a mood when you journal to see your trend here." />;
  }

  const plotLeft = Y_AXIS_WIDTH;
  const plotWidth = Math.max(width - plotLeft - PAD, 1);
  const plotHeight = height - PAD * 2;
  const xFor = (index: number) => plotLeft + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const yFor = (score: number) => PAD + (1 - (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * plotHeight;

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  data.forEach((point, index) => {
    if (point.score == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(index), y: yFor(point.score) });
  });
  if (current.length) segments.push(current);

  const scored = data.filter((p) => p.score != null) as (MoodTrendPoint & { score: number })[];
  const average = scored.reduce((sum, p) => sum + p.score, 0) / scored.length;
  const averageMood = MOOD_ICON_MAP[MOOD_BY_SCORE[Math.round(average)]];
  const latest = [...data].reverse().find((p) => p.mood != null);
  const active = activeIndex != null ? data[activeIndex] : null;
  const readout = active?.mood ? { mood: MOOD_ICON_MAP[active.mood], label: active.label } : null;
  const xLabelStep = Math.max(1, Math.ceil(data.length / 8));
  const today = todayKey();

  return (
    <View className="gap-2">
      <View className="h-6 flex-row items-center gap-2">
        {readout ? (
          <>
            <Icon name={readout.mood.icon} size={15} color={readout.mood.color} />
            <Text variant="body" color="primary" className="text-[13px] font-semibold">
              {readout.mood.label}
            </Text>
            <Text variant="body" color="muted" className="text-[12px]">
              {readout.label}
            </Text>
          </>
        ) : (
          <>
            <Icon name={averageMood.icon} size={15} color={averageMood.color} />
            <Text variant="body" color="primary" className="text-[13px] font-semibold">
              Mostly {averageMood.label.toLowerCase()}
            </Text>
            {showCurrentMood && latest?.mood && (
              <Text variant="body" color="muted" className="text-[12px]">
                · latest {MOOD_ICON_MAP[latest.mood].label.toLowerCase()}
              </Text>
            )}
          </>
        )}
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <>
            <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
              <Defs>
                <LinearGradient id="moodTrendWash" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={theme.accent} stopOpacity={0.18} />
                  <Stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {[1, 2, 3, 4, 5].map((score) => (
                <Line key={score} x1={plotLeft} x2={plotLeft + plotWidth} y1={yFor(score)} y2={yFor(score)} stroke={theme.grid} strokeWidth={1} />
              ))}

              {segments.map((segment, i) =>
                segment.length < 2 ? null : (
                  <Path
                    key={`wash-${i}`}
                    d={`${smoothPath(segment)} L ${segment[segment.length - 1].x} ${PAD + plotHeight} L ${segment[0].x} ${PAD + plotHeight} Z`}
                    fill="url(#moodTrendWash)"
                  />
                ),
              )}
              {segments.map((segment, i) => (
                <Path key={`line-${i}`} d={smoothPath(segment)} stroke={theme.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ))}

              {data.map((point, index) => {
                if (point.score == null) return null;
                const emphasized = point.date === today || activeIndex === index;
                return (
                  <Circle
                    key={point.date}
                    cx={xFor(index)}
                    cy={yFor(point.score)}
                    r={emphasized ? 5.5 : 4}
                    fill={point.mood ? MOOD_ICON_MAP[point.mood].color : theme.accent}
                    stroke={theme.surface}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>

            {/* Mood-icon y axis */}
            {[5, 4, 3, 2, 1].map((score) => {
              const mood = MOOD_ICON_MAP[MOOD_BY_SCORE[score]];
              return (
                <View key={score} pointerEvents="none" style={{ position: 'absolute', left: 0, top: yFor(score) - 7 }}>
                  <Icon name={mood.icon} size={14} color={mood.color} />
                </View>
              );
            })}

            {/* Generous hit targets (24px) around each point. */}
            {data.map((point, index) =>
              point.score == null ? null : (
                <Pressable
                  key={`hit-${point.date}`}
                  onHoverIn={() => setActiveIndex(index)}
                  onHoverOut={() => setActiveIndex(null)}
                  onPress={() => setActiveIndex((c) => (c === index ? null : index))}
                  accessibilityLabel={`${point.label}: ${point.mood ? MOOD_ICON_MAP[point.mood].label : ''}`}
                  style={{ position: 'absolute', left: xFor(index) - 12, top: yFor(point.score) - 12, width: 24, height: 24 }}
                />
              ),
            )}
          </>
        )}
      </View>

      {width > 0 && (
        <View style={{ height: 16 }}>
          {data.map((point, index) =>
            index % xLabelStep !== 0 ? null : (
              <Text
                key={point.date}
                variant="body"
                color={point.date === today ? 'primary' : 'muted'}
                style={{ position: 'absolute', left: xFor(index) - 16, width: 32, textAlign: 'center', fontSize: 11 }}
                numberOfLines={1}
              >
                {point.label}
              </Text>
            ),
          )}
        </View>
      )}
    </View>
  );
}
