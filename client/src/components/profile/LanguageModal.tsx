import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { LANGUAGES, setLanguage, useTranslation } from '../../i18n';
import { showToast } from '../../store/toastStore';
import type { Language } from '../../types/settings';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Modal, Text } from '../ui';

export interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Dedicated modal (not the generic OptionPickerModal used for Week Starts On) because each
 * row needs two lines — native name + English name — plus a flag, not just a single label.
 * Picking a language calls `setLanguage` (settingsStore) directly, which every `useTranslation()`
 * consumer is already subscribed to, so the whole app's translated strings update in the
 * same render this modal closes on.
 */
export function LanguageModal({ visible, onClose }: LanguageModalProps) {
  const { language } = useTranslation();

  const handleSelect = (code: Language, englishName: string) => {
    setLanguage(code);
    onClose();
    showToast(`Language changed to ${englishName}`);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Language" icon="Globe" size="sm">
      <View className="gap-1">
        {LANGUAGES.map((option) => {
          const selected = option.code === language;
          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelect(option.code, option.englishName)}
              className={cn('flex-row items-center gap-3 rounded-xl px-3 py-3 hover:bg-elevated', selected && 'bg-tide-teal/10')}
            >
              <Text style={{ fontSize: 20 }}>{option.flag}</Text>
              <View className="flex-1">
                <Text variant="body" color={selected ? 'accent' : 'primary'} className="normal-case tracking-normal">
                  {option.nativeName}
                </Text>
                {option.nativeName !== option.englishName && (
                  <Text variant="caption" color="muted" className="normal-case tracking-normal">
                    {option.englishName}
                  </Text>
                )}
              </View>
              {selected && <Icon name="Check" size={18} color={colors.brand.tideTeal} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}
