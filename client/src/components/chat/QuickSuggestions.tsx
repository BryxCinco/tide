import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { QuickSuggestion } from '../../types/chat';
import { Icon, Text, type IconName } from '../ui';

export interface QuickSuggestionsProps {
  suggestions: QuickSuggestion[];
  onSelect: (label: string) => void;
}

export const DEFAULT_QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { id: 'week', label: 'How was my week?', icon: 'CalendarDays' },
  { id: 'focus', label: 'What should I focus on today?', icon: 'Target' },
  { id: 'tip', label: 'Give me a productivity tip', icon: 'Lightbulb' },
  { id: 'tasks', label: 'Summarize my open tasks', icon: 'ListChecks' },
  { id: 'mood', label: 'How has my mood trended?', icon: 'Smile' },
  { id: 'streak', label: 'Am I keeping my habit streak?', icon: 'Flame' },
  { id: 'time', label: 'Where did my focus time go?', icon: 'PieChart' },
  { id: 'plan', label: 'Help me plan tomorrow', icon: 'ListTodo' },
];

/** Gemini/DeepSeek-style starter grid — small bordered cards with an icon badge and label
 * that wrap into as many columns as the panel width allows, shown before the conversation
 * starts (ChatPanel.tsx, via ChatConversation.tsx's empty state). Replaces the old
 * horizontal pill scroller, which rendered as stretched ovals once the empty state got a
 * fixed-height flex container (a horizontal ScrollView's content stretches its children to
 * fill the cross-axis height by default) — cards with their own intrinsic height sidestep
 * that entirely. Tapping one sends its label as a normal user message. */
export function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  const themeColors = useThemeColors();

  return (
    <View className="w-full flex-row flex-wrap gap-2.5 px-6">
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => onSelect(suggestion.label)}
          style={{ flexBasis: 210, flexGrow: 1 }}
          className="flex-row items-center gap-3 rounded-2xl border border-subtle bg-base px-3.5 py-3 transition-colors hover:border-tide-teal/50 hover:bg-tide-teal/5"
        >
          <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tide-teal/10">
            <Icon name={(suggestion.icon as IconName) ?? 'Sparkles'} size={15} color={themeColors.brand.tideTeal} />
          </View>
          <Text variant="body" color="secondary" className="flex-1 normal-case tracking-normal" numberOfLines={2}>
            {suggestion.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
