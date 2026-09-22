import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n';
import { showToast } from '../../store/toastStore';
import { useUserStore } from '../../store/userStore';
import { Avatar, Button, Icon, Input, Modal, Text } from '../ui';

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  /** Tapping the avatar preview hands off to AvatarPickerModal instead of opening a picker
   * nested inside this one — profile.tsx owns both modals' visibility, so this just closes
   * Edit Profile and asks the parent to open the other. */
  onChangeAvatar: () => void;
}

const BIO_MAX_LENGTH = 160;

/** Name + bio are the only fields this modal itself edits — email stays read-only ("contact
 * support to change"), and avatar changes go through AvatarPickerModal (see onChangeAvatar). */
export function EditProfileModal({ visible, onClose, onChangeAvatar }: EditProfileModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const updateProfile = useUserStore((s) => s.updateProfile);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(user?.name ?? '');
    setBio(user?.bio ?? '');
    setError(null);
  }, [visible, user]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give yourself a name.');
      return;
    }

    updateProfile({ name: trimmedName, bio: bio.trim() || undefined });
    onClose();
    showToast('Profile updated');
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Profile" size="md">
      <View className="gap-5">
        <Pressable onPress={onChangeAvatar} className="items-center gap-2">
          <View className="relative">
            <Avatar name={name || user?.name} source={user?.avatar} size="xl" ring ringColor="teal" />
            <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border-2 border-base bg-tide-teal">
              <Icon name="Camera" size={13} color="#FFFFFF" />
            </View>
          </View>
          <Text variant="caption" color="accent" className="normal-case tracking-normal">
            Change Photo
          </Text>
        </Pressable>

        <Input
          label="Name"
          placeholder="Your name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          error={error ?? undefined}
        />

        <View className="gap-2">
          <Input label="Email" value={user?.email} editable={false} />
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            Contact support to change your email.
          </Text>
        </View>

        <View className="gap-1">
          <Input
            label="Bio"
            placeholder="A short line about you..."
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_MAX_LENGTH))}
            multiline
          />
          <Text variant="caption" color="muted" className="self-end normal-case tracking-normal">
            {bio.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Button title={t('common.cancel')} variant="secondary" fullWidth onPress={onClose} />
          <Button title={t('common.save')} variant="primary" fullWidth onPress={handleSave} />
        </View>
      </View>
    </Modal>
  );
}
