import { View } from 'react-native';

import { useThemeColors } from '../../../hooks/useThemeColors';
import { Icon, type IconName, Text, useGlassSurface } from '../../ui';
import { Pressable } from '../../ui/SoundPressable';
import type { BlockEditorHandle } from './BlockEditor';

export interface KeyboardBlockToolbarProps {
  editor: React.RefObject<BlockEditorHandle | null>;
}

/** Phone-only strip above the keyboard: typing "/" is awkward on a touch keyboard. */
export function KeyboardBlockToolbar({ editor }: KeyboardBlockToolbarProps) {
  const theme = useThemeColors();
  const glass = useGlassSurface();
  const actions: { label: string; icon?: IconName; text?: string; run: () => void }[] = [
    { label: 'Commands', text: '/', run: () => editor.current?.openSlash() },
    { label: 'To-do', icon: 'SquareCheck', run: () => editor.current?.setType('todo') },
    { label: 'Bulleted list', icon: 'List', run: () => editor.current?.setType('bullet') },
    { label: 'Heading', icon: 'Heading', run: () => editor.current?.cycleHeading() },
    { label: 'Quote', icon: 'Quote', run: () => editor.current?.setType('quote') },
  ];

  return (
    <View className="flex-row items-center gap-1 border-t border-default px-2 py-1.5" style={glass}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={a.run}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          className="h-10 min-w-[44px] items-center justify-center rounded-xl px-2"
        >
          {a.icon ? (
            <Icon name={a.icon} size={19} color={theme.text.secondary} />
          ) : (
            <Text variant="body" className="text-[18px] font-semibold" style={{ color: theme.text.secondary }}>
              {a.text}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
