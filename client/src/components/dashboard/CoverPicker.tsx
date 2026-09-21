import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { PRESET_COLORS } from '../../mocks/mockActivities';
import { COVER_GRADIENTS } from '../../store/userStore';
import type { CoverType } from '../../types/user';
import { colors } from '../../utils/theme';
import { Button, Icon, Modal, Text } from '../ui';

export interface CoverPickerProps {
  visible: boolean;
  onClose: () => void;
  currentType: CoverType;
  currentValue: string;
  onSelect: (coverType: CoverType, coverValue: string) => void;
}

/** Bottom-sheet-on-phone / centered-on-desktop picker (via the shared Modal) for the
 * Dashboard cover: a gradient preset or a solid color. Image upload needs
 * expo-image-picker, which isn't installed — the button below is a disabled placeholder
 * rather than a silent new dependency. */
export function CoverPicker({ visible, onClose, currentType, currentValue, onSelect }: CoverPickerProps) {
  return (
    <Modal visible={visible} onClose={onClose} title="Change Cover" size="md">
      <View className="gap-5">
        <Button title="Upload a photo" variant="secondary" icon="Upload" disabled fullWidth />

        <View className="gap-2">
          <Text variant="label" color="muted">
            Gradients
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {COVER_GRADIENTS.map((gradient) => {
              const isSelected = currentType === 'gradient' && currentValue === gradient.id;
              return (
                <Pressable
                  key={gradient.id}
                  onPress={() => onSelect('gradient', gradient.id)}
                  className="h-14 w-14 overflow-hidden rounded-xl"
                  style={{ borderWidth: isSelected ? 2 : 0, borderColor: colors.brand.tideTeal }}
                >
                  <LinearGradient colors={gradient.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                  {isSelected && (
                    <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                      <Icon name="Check" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text variant="label" color="muted">
            Solid Color
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PRESET_COLORS.map((hex) => {
              const isSelected = currentType === 'solid' && currentValue === hex;
              return (
                <Pressable
                  key={hex}
                  onPress={() => onSelect('solid', hex)}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: hex, borderWidth: isSelected ? 2 : 0, borderColor: colors.brand.tideTeal }}
                >
                  {isSelected && <Icon name="Check" size={16} color="#FFFFFF" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
