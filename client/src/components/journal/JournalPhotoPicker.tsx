import { useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { showToast } from '../../store/toastStore';
import { MAX_JOURNAL_PHOTOS } from '../../types/journal';
import { pickImage, type ImageSource } from '../../utils/imageUpload';
import { Icon, Modal, Text, type IconName } from '../ui';
import { PhotoViewerModal } from './PhotoViewerModal';

export interface JournalPhotoPickerProps {
  /** A mix of existing https:// URLs (already saved) and data: URIs (just picked, not yet
   * saved) — JournalEditor holds the single source of truth and persists this whole list on
   * save, the same way title/content/mood/tags already work. */
  photoUris: string[];
  onChange: (uris: string[]) => void;
  disabled?: boolean;
}

const THUMB_SIZE = 72;

interface RowOption {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}

/** Thumbnail row (up to MAX_JOURNAL_PHOTOS) + an "Add Photo" tile. Tapping a thumbnail opens
 * it full-size (PhotoViewerModal); its own small X removes it instead. Tapping "Add Photo"
 * opens a small action-sheet style modal — same pattern as AvatarPickerModal — offering
 * Take Photo / Choose from Library via the existing pickImage() utility. */
export function JournalPhotoPicker({ photoUris, onChange, disabled }: JournalPhotoPickerProps) {
  const themeColors = useThemeColors();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const canAddMore = photoUris.length < MAX_JOURNAL_PHOTOS;

  const handlePick = async (source: ImageSource) => {
    setIsPicking(true);
    const result = await pickImage(source);
    setIsPicking(false);

    if (!result.ok) {
      if (result.reason === 'too-large') showToast('That image is over 2MB — try a smaller one.', 'error');
      else if (result.reason === 'permission-denied') showToast('Permission denied — enable photo access in your device settings.', 'error');
      return;
    }

    onChange([...photoUris, result.uri]);
    setPickerVisible(false);
  };

  const handleRemove = (index: number) => {
    onChange(photoUris.filter((_, i) => i !== index));
  };

  const options: RowOption[] = [
    ...(Platform.OS !== 'web' ? [{ key: 'camera', icon: 'Camera' as IconName, label: 'Take Photo', onPress: () => handlePick('camera') }] : []),
    { key: 'library', icon: 'Image', label: 'Choose from Library', onPress: () => handlePick('library') },
  ];

  return (
    <View className="gap-2">
      <Text variant="label" color="muted">
        Photos ({photoUris.length}/{MAX_JOURNAL_PHOTOS})
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {photoUris.map((uri, index) => (
          <View key={uri} style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
            <Pressable onPress={() => setViewerUri(uri)} className="h-full w-full overflow-hidden rounded-xl">
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
            {!disabled && (
              <Pressable
                onPress={() => handleRemove(index)}
                hitSlop={8}
                className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: themeColors.status.error }}
              >
                <Icon name="X" size={13} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        ))}

        {!disabled && canAddMore && (
          <Pressable
            onPress={() => setPickerVisible(true)}
            className="items-center justify-center rounded-xl border border-dashed border-subtle"
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          >
            <Icon name="Plus" size={20} color={themeColors.text.muted} />
          </Pressable>
        )}
      </View>

      <Modal visible={pickerVisible} onClose={() => setPickerVisible(false)} title="Add Photo" icon="Image" size="sm">
        {isPicking ? (
          <View className="items-center py-6">
            <ActivityIndicator color={themeColors.brand.tideTeal} />
          </View>
        ) : (
          <View className="gap-1">
            {options.map((option) => (
              <Pressable
                key={option.key}
                onPress={option.onPress}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3 hover:bg-elevated"
              >
                <Icon name={option.icon} size={18} color={themeColors.text.secondary} />
                <Text variant="body" color="primary" className="normal-case tracking-normal">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Modal>

      <PhotoViewerModal visible={Boolean(viewerUri)} onClose={() => setViewerUri(null)} uri={viewerUri} />
    </View>
  );
}
