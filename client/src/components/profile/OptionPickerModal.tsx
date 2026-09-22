import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Modal, type IconName, Text } from '../ui';

export interface OptionPickerOption<T extends string> {
  value: T;
  label: string;
}

export interface OptionPickerModalProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: IconName;
  options: OptionPickerOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

/** Generic single-select list modal — Language and Week Starts On both need the exact same
 * "list of options, checkmark on the current one, tap to pick and close" interaction, so
 * this is shared rather than duplicated. No native picker/dropdown library is installed
 * (same reasoning as TaskFormModal's tag/status pills), so this plays that role instead. */
export function OptionPickerModal<T extends string>({ visible, onClose, title, icon, options, value, onSelect }: OptionPickerModalProps<T>) {
  return (
    <Modal visible={visible} onClose={onClose} title={title} icon={icon} size="sm">
      <View className="gap-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              className={cn('flex-row items-center justify-between rounded-xl px-3 py-3 hover:bg-elevated', selected && 'bg-tide-teal/10')}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text variant="body" color={selected ? 'accent' : 'primary'} className="normal-case tracking-normal">
                {option.label}
              </Text>
              {selected && <Icon name="Check" size={18} color={colors.brand.tideTeal} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}
