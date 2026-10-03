import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { LANGUAGES, setLanguage, useTranslation } from '../../i18n';
import { showToast } from '../../store/toastStore';
import type { Language } from '../../types/settings';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Modal, Text, useModalBodyMaxHeight } from '../ui';
import { SearchBar } from '../journal/SearchBar';

// SearchBar's own rendered height plus the gap-3 spacing above the list — netted out of the
// modal's real body budget below, since useModalBodyMaxHeight() hands back the WHOLE body's
// allowance, not just what's left over after this modal's own SearchBar sibling.
const SEARCH_BAR_ALLOWANCE = 56;

export interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Split out purely so it can call useModalBodyMaxHeight() — see CustomizeDashboardModal's
 * WidgetDraggableList for why that hook only resolves inside Modal's own `children` subtree,
 * not in LanguageModal's own top-level scope (which renders ABOVE/around the `<Modal>` that
 * provides it). Owns the search query itself too, since nothing outside this subtree needs it. */
function LanguageOptionsList({ language, onSelect }: { language: Language; onSelect: (code: Language, englishName: string) => void }) {
  const bodyMaxHeight = useModalBodyMaxHeight();
  const listMaxHeight = bodyMaxHeight != null ? Math.max(120, bodyMaxHeight - SEARCH_BAR_ALLOWANCE) : 320;
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (option) => option.nativeName.toLowerCase().includes(q) || option.englishName.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <View className="gap-3">
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search languages..." />

      <ScrollView style={{ maxHeight: listMaxHeight }} showsVerticalScrollIndicator={false}>
        <View className="gap-1">
          {filtered.map((option) => {
            const selected = option.code === language;
            return (
              <Pressable
                key={option.code}
                onPress={() => onSelect(option.code, option.englishName)}
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

          {filtered.length === 0 && (
            <Text variant="body" color="muted" className="px-3 py-6 text-center normal-case tracking-normal">
              No languages match "{query}".
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
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
    <Modal visible={visible} onClose={onClose} title="Language" icon="Globe" size="sm" scrollable={false}>
      <LanguageOptionsList language={language} onSelect={handleSelect} />
    </Modal>
  );
}
