import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { PRESET_COLORS } from '../../mocks/mockActivities';
import { getApiErrorMessage } from '../../services/api';
import { showToast } from '../../store/toastStore';
import { COVER_GRADIENTS, useUserStore } from '../../store/userStore';
import type { CoverType } from '../../types/user';
import { cn } from '../../utils/cn';
import { pickImage, type ImageSource } from '../../utils/imageUpload';
import { colors } from '../../utils/theme';
import { Icon, Modal, Text, type IconName } from '../ui';

export interface CoverPickerProps {
  visible: boolean;
  onClose: () => void;
  currentType: CoverType;
  currentValue: string;
}

function OptionRow({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  const themeColors = useThemeColors();
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-xl px-3 py-3 hover:bg-elevated">
      <Icon name={icon} size={18} color={danger ? themeColors.status.error : themeColors.text.secondary} />
      <Text variant="body" color="primary" className={cn('normal-case tracking-normal', danger && 'text-error')}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Owns its update/remove actions directly (userStore) instead of taking an `onSelect`
 * callback the caller has to wire up — both call sites (ProfileHeader on the Dashboard,
 * ProfileCover on Profile) want the exact same behavior for every option here, so there
 * was nothing for a callback prop to actually vary between them. Take Photo/Choose from
 * Library use the same `pickImage` util and 2MB cap as AvatarPickerModal; gradients/solid
 * colors are the original preset pickers this component already had.
 */
export function CoverPicker({ visible, onClose, currentType, currentValue }: CoverPickerProps) {
  const updateCover = useUserStore((s) => s.updateCover);
  const removeCover = useUserStore((s) => s.removeCover);
  const themeColors = useThemeColors();
  const [isPicking, setIsPicking] = useState(false);
  // Distinct from isPicking — covers the PATCH /api/profile round trip once a photo/preset
  // is chosen, so the spinner stays up until the change is actually saved server-side.
  const [isSaving, setIsSaving] = useState(false);
  const isBusy = isPicking || isSaving;

  const handlePick = async (source: ImageSource) => {
    setIsPicking(true);
    const result = await pickImage(source);
    setIsPicking(false);

    if (!result.ok) {
      if (result.reason === 'too-large') showToast('That image is over 2MB — try a smaller one.', 'error');
      else if (result.reason === 'permission-denied') showToast('Permission denied — enable photo access in your device settings.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateCover('image', result.uri);
      onClose();
      showToast('Cover photo updated');
    } catch (err) {
      showToast(getApiErrorMessage(err, "Couldn't save your cover photo. Please try again."), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await removeCover();
      onClose();
      showToast('Cover photo removed');
    } catch (err) {
      showToast(getApiErrorMessage(err, "Couldn't remove your cover photo. Please try again."), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPreset = async (type: CoverType, value: string) => {
    setIsSaving(true);
    try {
      await updateCover(type, value);
      onClose();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Couldn't save your cover. Please try again."), 'error');
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Change Cover" icon="Image" size="md">
      <View className="gap-5">
        {isBusy ? (
          <View className="items-center py-6">
            <ActivityIndicator color={themeColors.brand.tideTeal} />
          </View>
        ) : (
          <View className="gap-1">
            {Platform.OS !== 'web' && <OptionRow icon="Camera" label="Take Photo" onPress={() => handlePick('camera')} />}
            <OptionRow icon="Image" label="Choose from Library" onPress={() => handlePick('library')} />
            {currentType === 'image' && <OptionRow icon="Trash2" label="Remove Cover" danger onPress={handleRemove} />}
          </View>
        )}

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
                  onPress={() => handleSelectPreset('gradient', gradient.id)}
                  disabled={isBusy}
                  className={cn('h-14 w-14 overflow-hidden rounded-xl', isBusy && 'opacity-50')}
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
                  onPress={() => handleSelectPreset('solid', hex)}
                  disabled={isBusy}
                  className={cn('h-10 w-10 items-center justify-center rounded-full', isBusy && 'opacity-50')}
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
