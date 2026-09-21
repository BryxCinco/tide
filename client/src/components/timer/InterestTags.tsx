import { Pressable, Text as RNText, View } from 'react-native';

import { cn } from '../../utils/cn';
import { Text } from '../ui';

export interface InterestTagsProps {
  tags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
}

/** Multi-select chip row — no restriction on when it can be edited (unlike ActivityPicker/Notes). */
export function InterestTags({ tags, selectedTags, onToggle }: InterestTagsProps) {
  return (
    <View className="gap-3">
      <Text variant="label" color="muted">
        Tag this session
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => onToggle(tag)}
              className={cn(
                'rounded-full border px-3 py-1.5',
                isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-default bg-base',
              )}
            >
              <RNText className={cn('text-sm', isSelected ? 'font-medium text-tide-teal' : 'text-muted')}>
                {tag}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
