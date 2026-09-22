import { View } from 'react-native';

import type { ChatMessage } from '../../types/chat';
import { cn } from '../../utils/cn';
import { Text } from '../ui';
import { AIAvatar } from './AIAvatar';

export interface ChatBubbleProps {
  message: ChatMessage;
}

/** ChatGPT/Claude-style bubble — user right-aligned teal, assistant left-aligned
 * bg-elevated with the AI avatar. The "tail" corner (rounded-br-sm / rounded-bl-sm) is
 * the one visual cue distinguishing sender at a glance without re-reading alignment. */
export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View className={cn('flex-row items-end gap-2 px-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <AIAvatar size={28} pulse={false} />}
      <View
        className={cn(
          'max-w-[78%] rounded-2xl px-4 py-2.5 md:max-w-[65%]',
          isUser ? 'rounded-br-sm bg-tide-teal' : 'rounded-bl-sm bg-elevated',
        )}
      >
        <Text variant="body" color={isUser ? 'inverse' : 'primary'}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}
