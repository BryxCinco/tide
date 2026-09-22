import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useUserStore } from '../../store/userStore';
import { showToast } from '../../store/toastStore';
import { pickImage, type ImageSource } from '../../utils/imageUpload';
import { cn } from '../../utils/cn';
import { Avatar, Icon, Modal, Text, type IconName } from '../ui';

export interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RowOption {
  key: string;
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}

/** Camera capture is hidden on web — expo-image-picker's `launchCameraAsync` has no web
 * implementation, so offering it there would be a dead end (see imageUpload.ts). */
export function AvatarPickerModal({ visible, onClose }: AvatarPickerModalProps) {
  const { user } = useAuth();
  const updateAvatar = useUserStore((s) => s.updateAvatar);
  const removeAvatar = useUserStore((s) => s.removeAvatar);
  const themeColors = useThemeColors();
  const [isPicking, setIsPicking] = useState(false);

  const handlePick = async (source: ImageSource) => {
    setIsPicking(true);
    const result = await pickImage(source);
    setIsPicking(false);

    if (result.ok) {
      updateAvatar(result.uri);
      onClose();
      showToast('Avatar updated');
      return;
    }

    if (result.reason === 'too-large') showToast('That image is over 2MB — try a smaller one.', 'error');
    else if (result.reason === 'permission-denied') showToast('Permission denied — enable photo access in your device settings.', 'error');
    // 'cancelled' / 'unsupported' — the user just backed out, nothing to report.
  };

  const handleRemove = () => {
    removeAvatar();
    onClose();
    showToast('Avatar removed');
  };

  const options: RowOption[] = [
    ...(Platform.OS !== 'web' ? [{ key: 'camera', icon: 'Camera' as IconName, label: 'Take Photo', onPress: () => handlePick('camera') }] : []),
    { key: 'library', icon: 'Image', label: 'Choose from Library', onPress: () => handlePick('library') },
    ...(user?.avatar ? [{ key: 'remove', icon: 'Trash2' as IconName, label: 'Remove Avatar', danger: true, onPress: handleRemove }] : []),
  ];

  return (
    <Modal visible={visible} onClose={onClose} title="Change Avatar" size="sm">
      <View className="gap-4">
        <View className="items-center">
          <Avatar name={user?.name} source={user?.avatar} size="xl" ring ringColor="teal" />
        </View>

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
                <Icon name={option.icon} size={18} color={option.danger ? themeColors.status.error : themeColors.text.secondary} />
                <Text variant="body" color="primary" className={cn('normal-case tracking-normal', option.danger && 'text-error')}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
