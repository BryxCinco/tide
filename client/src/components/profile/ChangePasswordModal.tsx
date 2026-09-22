import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { showToast } from '../../store/toastStore';
import { Button, Input, Modal } from '../ui';

export interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Mock, same as Delete Account — there's no auth backend with a real password to check
 * against yet. Unlike the old "Coming soon" row this replaces, it still validates its
 * inputs for real (non-empty, new/confirm matching) before "succeeding", so it isn't a
 * dead end. */
export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  }, [visible]);

  const handleSubmit = () => {
    if (!current || !next || !confirm) {
      setError('Fill in every field.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation don\'t match.');
      return;
    }

    onClose();
    showToast('Password updated');
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Change Password" icon="Lock" size="sm">
      <View className="gap-4">
        <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <Input
          label="New password"
          value={next}
          onChangeText={(text) => {
            setNext(text);
            if (error) setError(null);
          }}
          secureTextEntry
          error={error ?? undefined}
        />
        <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />

        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" fullWidth onPress={onClose} />
          <Button title="Update Password" variant="primary" fullWidth onPress={handleSubmit} />
        </View>
      </View>
    </Modal>
  );
}
