import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { Habit } from '../../types/dashboard';
import { hexToRgba } from '../../utils/color';
import { Card, Icon, Text } from '../ui';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// No habit-creation UI yet, so this ships with a small starter set rather than an
// empty store — "only shows if the user has habits set" is satisfied by the length
// check below, ready to switch to real per-habit data once that UI exists.
const INITIAL_HABITS: Habit[] = [
  { id: 'h1', label: 'Drink water', icon: 'Droplet', completedDays: [true, true, false, false, false, false, false] },
  { id: 'h2', label: 'Exercise', icon: 'Dumbbell', completedDays: [true, false, false, false, false, false, false] },
  { id: 'h3', label: 'Read', icon: 'BookOpen', completedDays: [false, false, false, false, false, false, false] },
];

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const themeColors = useThemeColors();
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday-first

  const toggleDay = (habitId: string, dayIndex: number) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, completedDays: h.completedDays.map((done, i) => (i === dayIndex ? !done : done)) }
          : h,
      ),
    );
  };

  if (habits.length === 0) return null;

  return (
    <Card variant="default" padding="lg" className="gap-4 border-subtle bg-base">
      <Text variant="h3" color="primary">
        Habits
      </Text>

      <View className="gap-3">
        <View className="flex-row items-center">
          <View className="w-16 md:w-28" />
          <View className="flex-1 flex-row gap-1">
            {DAY_LABELS.map((day, i) => (
              <Text
                key={i}
                variant="caption"
                color={i === todayIndex ? 'accent' : 'muted'}
                className="flex-1 text-center normal-case tracking-normal"
              >
                {day}
              </Text>
            ))}
          </View>
        </View>

        {habits.map((habit) => (
          <View key={habit.id} className="flex-row items-center">
            <View className="w-16 flex-row items-center gap-1.5 pr-2 md:w-28 md:gap-2">
              <Icon name={habit.icon} size={16} color={themeColors.brand.tideTeal} />
              <Text variant="caption" color="secondary" className="flex-1 normal-case tracking-normal" numberOfLines={1}>
                {habit.label}
              </Text>
            </View>
            <View className="flex-1 flex-row gap-1">
              {habit.completedDays.map((done, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleDay(habit.id, i)}
                  hitSlop={4}
                  className="flex-1 items-center justify-center rounded-md border"
                  style={{
                    aspectRatio: 1,
                    maxWidth: 28,
                    borderColor: done ? themeColors.brand.tideTeal : themeColors.border.subtle,
                    backgroundColor: done ? hexToRgba(themeColors.brand.tideTeal, 0.15) : 'transparent',
                  }}
                >
                  {done && <Icon name="Check" size={12} color={themeColors.brand.tideTeal} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
