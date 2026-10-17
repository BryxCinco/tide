import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { Text } from '../ui';

export interface SmartSuggestionsProps {
  /** The AI's most recent reply — scanned for keywords to pick a relevant suggestion set. */
  lastAssistantMessage: string;
  onSelect: (label: string) => void;
}

// Checked in order, first match wins — a reply can plausibly mention more than one keyword
// (e.g. "tasks" and "focus time" in the same sentence), so this is a deliberate priority,
// not just whichever regex happens to run last.
const SUGGESTION_RULES: { pattern: RegExp; suggestions: string[] }[] = [
  { pattern: /\btasks?\b/i, suggestions: ['Show all tasks', 'Create a task', 'Mark one as done'] },
  { pattern: /\bfocus time\b/i, suggestions: ['Start a session', 'View insights', 'See this week'] },
  { pattern: /\bmood\b/i, suggestions: ['Log mood', 'See mood history', 'Write journal'] },
  { pattern: /\bstreaks?\b/i, suggestions: ['How to keep my streak', 'See all stats'] },
];

const FALLBACK_SUGGESTIONS = ["What's my progress?", 'Plan my day', 'Give me a tip'];

function getSuggestions(lastAssistantMessage: string): string[] {
  const rule = SUGGESTION_RULES.find((r) => r.pattern.test(lastAssistantMessage));
  return rule ? rule.suggestions : FALLBACK_SUGGESTIONS;
}

/**
 * Context-aware follow-up chips shown under the AI's latest reply (Fix 7) — the parent
 * (app/chat.tsx) only renders this while the user hasn't started typing a new message and
 * nothing is currently being generated, which is what gives the "auto-hide after user types"
 * behavior; this component itself has no visibility logic of its own.
 */
export function SmartSuggestions({ lastAssistantMessage, onSelect }: SmartSuggestionsProps) {
  const { isPhone } = useResponsive();
  const suggestions = getSuggestions(lastAssistantMessage);

  const chips = suggestions.map((label) => (
    <Pressable
      key={label}
      onPress={() => onSelect(label)}
      className="rounded-full border border-subtle bg-surface px-3.5 py-2 transition-colors hover:border-tide-teal/50 hover:bg-tide-teal/5"
    >
      <Text variant="body" color="secondary" className="text-[13px] font-medium">
        {label}
      </Text>
    </Pressable>
  ));

  if (isPhone) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-2 pb-3 pl-[56px] pr-4"
      >
        {chips}
      </ScrollView>
    );
  }

  return <View className="flex-row flex-wrap gap-2 pb-3 pl-[64px] pr-6">{chips}</View>;
}
