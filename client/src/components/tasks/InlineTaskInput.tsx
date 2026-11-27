import { useState } from 'react';
import { Platform, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { TextInput } from '../ui/SoundTextInput';

export interface InlineTaskInputProps {
  onSubmit: (title: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * "+ New" that turns into a text field in place. Enter adds the task and keeps the field open
 * for the next one (Notion's rapid entry); Escape, or leaving it empty, closes it.
 */
export function InlineTaskInput({ onSubmit, placeholder = 'Type a task, press Enter', label = 'New' }: InlineTaskInputProps) {
  const theme = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const title = draft.trim();
    if (title) onSubmit(title);
    setDraft('');
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} task`}
        className="flex-row items-center gap-1.5 rounded-xl px-2.5 py-2 hover:bg-[rgba(100,116,139,0.08)]"
      >
        <Icon name="Plus" size={15} color={theme.text.muted} />
        <Text variant="body" color="muted" className="text-[13.5px]">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-tide-teal bg-elevated px-2.5 py-1.5">
      <Icon name="Circle" size={15} color={theme.text.disabled} />
      <TextInput
        autoFocus
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={theme.text.disabled}
        onSubmitEditing={submit}
        submitBehavior="submit"
        blurOnSubmit={false}
        returnKeyType="done"
        onKeyPress={(e) => {
          if (Platform.OS === 'web' && e.nativeEvent.key === 'Escape') {
            setDraft('');
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (!draft.trim()) setOpen(false);
        }}
        className="flex-1 p-0 font-sans text-[14px] text-primary"
        accessibilityLabel="New task title"
      />
    </View>
  );
}
