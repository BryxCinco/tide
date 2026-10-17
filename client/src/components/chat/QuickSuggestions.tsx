import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { QuickSuggestion } from '../../types/chat';
import { Icon, Text, type IconName } from '../ui';

export interface QuickSuggestionsProps {
  suggestions: QuickSuggestion[];
  onSelect: (label: string) => void;
}

export const DEFAULT_QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { id: 'focus', label: 'What should I focus on today?', icon: 'Target' },
  { id: 'week', label: 'How was my week?', icon: 'CalendarDays' },
  { id: 'tip', label: 'Give me a productivity tip', icon: 'Lightbulb' },
  { id: 'tasks', label: 'Summarize my open tasks', icon: 'ListChecks' },
  { id: 'mood', label: 'How has my mood trended?', icon: 'Smile' },
  { id: 'streak', label: 'Am I keeping my habit streak?', icon: 'Flame' },
  { id: 'time', label: 'Where did my focus time go?', icon: 'PieChart' },
  { id: 'plan', label: 'Help me plan tomorrow', icon: 'ListTodo' },
];

/** Starter grid shown in the AI Coach's empty state — two columns of compact cards on phone
 * (trimmed to the first six so the hero still fits without scrolling), up to four on desktop.
 * Tapping one sends its label as a normal user message. */
export function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  const themeColors = useThemeColors();
  const { isPhone } = useResponsive();
  const visible = isPhone ? suggestions.slice(0, 6) : suggestions;

  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2.5">
      {visible.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => onSelect(suggestion.label)}
          style={{ flexBasis: isPhone ? '47%' : '23%', flexGrow: 1 }}
          className="gap-2.5 rounded-2xl border border-subtle bg-surface p-3.5 transition-colors hover:border-tide-teal/40"
        >
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-tide-teal/10">
            <Icon name={(suggestion.icon as IconName) ?? 'Sparkles'} size={16} color={themeColors.brand.tideTeal} />
          </View>
          <Text variant="body" color="secondary" className="text-[13px] font-medium leading-[18px]" numberOfLines={2}>
            {suggestion.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
