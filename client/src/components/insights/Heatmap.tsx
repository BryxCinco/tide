import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { HeatmapDay } from '../../types/insights';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';

export interface HeatmapProps {
  days: HeatmapDay[];
}

const CELL_GAP = 6;
const COLUMNS = 10;

/** Reference used to turn a day's tracked seconds into a "productivity %" — 6 focused
 * hours reads as a full day, matching the existing level-4 bucket's own >=5h threshold
 * below (a 5h day already reads as "practically full" before this, so 6h=100% keeps that
 * feel rather than requiring an unrealistic 8+ hour day just to hit 100%). */
const DAILY_GOAL_SECONDS = 6 * 3600;

function productivityPercent(seconds: number): number {
  return Math.min(100, Math.round((seconds / DAILY_GOAL_SECONDS) * 100));
}

/** GitHub-style contribution grid — 30 cells, opacity-scaled teal per level (0-4). Cells
 * are `flex: 1, aspectRatio: 1` (stretch to fill the row, stay square) rather than a
 * fixed pixel size, so the grid genuinely fills the bento 'lg' full-width card instead of
 * leaving empty space on wide screens. */
export function Heatmap({ days }: HeatmapProps) {
  const themeColors = useThemeColors();
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const hoveredDay = days.find((d) => d.date === hoveredDate);

  const levelOpacity: Record<HeatmapDay['level'], number> = { 0: 0, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };

  const rows: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += COLUMNS) {
    rows.push(days.slice(i, i + COLUMNS));
  }

  return (
    <View>
      {hoveredDay && (
        <View className="mb-2 flex-row items-center gap-2">
          <Text variant="caption" color="primary" className="normal-case tracking-normal">
            {new Date(hoveredDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            {hoveredDay.seconds > 0 ? formatDuration(hoveredDay.seconds) : 'No tracked time'}
          </Text>
        </View>
      )}
      <View style={{ gap: CELL_GAP }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: CELL_GAP }}>
            {row.map((day) => {
              const percent = productivityPercent(day.seconds);
              // A day this saturated (level 3-4, teal opacity >= 0.75) is dark enough that
              // white reads better than the theme's near-black text-primary; lighter cells
              // (levels 0-2, including the empty theme.background.hover cell) keep
              // text-primary instead. Always visible >=50% per spec; below that it only
              // shows on hover, alongside the exact time in the tooltip line above.
              const isHovered = hoveredDate === day.date;
              const showPercent = percent >= 50 || isHovered;

              return (
                <Pressable
                  key={day.date}
                  onHoverIn={() => setHoveredDate(day.date)}
                  onHoverOut={() => setHoveredDate(null)}
                  onPress={() => setHoveredDate((current) => (current === day.date ? null : day.date))}
                  className="items-center justify-center"
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 4,
                    backgroundColor:
                      day.level === 0
                        ? themeColors.background.hover
                        : hexToRgba(themeColors.brand.tideTeal, levelOpacity[day.level]),
                    borderWidth: isHovered ? 1.5 : 0,
                    borderColor: themeColors.text.primary,
                  }}
                >
                  {showPercent && day.seconds > 0 && (
                    <Text
                      style={{
                        fontSize: 10,
                        lineHeight: 12,
                        fontWeight: '600',
                        color: day.level >= 3 ? '#FFFFFF' : themeColors.text.primary,
                      }}
                    >
                      {percent}%
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View className="mt-2 flex-row items-center gap-1.5 self-end">
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          Less
        </Text>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor:
                level === 0 ? themeColors.background.hover : hexToRgba(themeColors.brand.tideTeal, levelOpacity[level]),
            }}
          />
        ))}
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          More
        </Text>
      </View>
    </View>
  );
}
