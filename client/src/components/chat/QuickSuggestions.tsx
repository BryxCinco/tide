import { Pressable, ScrollView } from 'react-native';

import type { QuickSuggestion } from '../../types/chat';
import { Text } from '../ui';

export interface QuickSuggestionsProps {
  suggestions: QuickSuggestion[];
  onSelect: (label: string) => void;
}

export const DEFAULT_QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { id: 'week', label: 'How was my week?' },
  { id: 'focus', label: 'What should I focus on?' },
  { id: 'tip', label: 'Give me a productivity tip' },
];

/** Horizontal chip row shown before the conversation starts (ChatPanel.tsx) — tapping one
 * sends its label as a normal user message, it isn't a special message type of its own. */
export function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-2"
      keyboardShouldPersistTaps="handled"
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => onSelect(suggestion.label)}
          className="rounded-full border border-subtle bg-elevated px-3.5 py-2 hover:border-tide-teal hover:bg-tide-teal/5"
        >
          <Text variant="caption" color="secondary" className="normal-case tracking-normal">
            {suggestion.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
