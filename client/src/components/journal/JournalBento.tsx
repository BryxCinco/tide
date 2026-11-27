import { View } from 'react-native';

import { BentoTile, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';

const PROMPTS = [
  'What made today feel worth it?',
  'What drained your energy, and what gave it back?',
  'One small win you almost didn’t notice?',
  'What are you avoiding — and why?',
  'What would make tomorrow 1% better?',
  'Who helped you today, even a little?',
  'What did you learn that surprised you?',
  'Where did your focus actually go today?',
  'What are you grateful for right now?',
  'If today had a title, what would it be?',
];

/** Same prompt all day, a new one each day. */
function promptOfTheDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return PROMPTS[dayOfYear % PROMPTS.length];
}

/**
 * Focus-first Journal header: today's prompt as one slim line with a Start-writing button,
 * so the entries themselves are on screen right away.
 */
export function JournalPromptBanner({ onWrite, className }: { onWrite: () => void; className?: string }) {
  return (
    <BentoTile tone="lagoon" dense index={0} className={className}>
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
        <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name="Sparkles" size={12} color="#FFFFFF" />
          <Text variant="body" className="text-[11.5px] font-semibold" style={{ color: '#FFFFFF' }}>
            Today's prompt
          </Text>
        </View>
        <Text variant="h3" className="flex-1 text-[16px] leading-[22px]" style={{ color: '#FFFFFF', minWidth: 200 }}>
          {promptOfTheDay()}
        </Text>
        <Pressable onPress={onWrite} accessibilityRole="button" className="flex-row items-center gap-1.5 rounded-full bg-white px-3.5 py-2">
          <Icon name="PenLine" size={14} color="#0F766E" />
          <Text variant="body" className="text-[13px] font-semibold" style={{ color: '#0F766E' }}>
            Start writing
          </Text>
        </Pressable>
      </View>
    </BentoTile>
  );
}
