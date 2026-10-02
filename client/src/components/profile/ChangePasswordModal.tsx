import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { getApiErrorMessage } from '../../services/api';
import { authService } from '../../services/auth.service';
import { showToast } from '../../store/toastStore';
import { Button, Input, Modal } from '../ui';

export interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/** For a Google-only account (no password set yet), `currentPassword` can never verify —
 * that's expected, not a bug here; SetPasswordModal (shown right after a Google sign-in)
 * is their path to a first password, not this screen. */
export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  }, [visible]);

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      setError('Fill in every field.');
      return;
    }
    if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) {
      setError('New password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation don\'t match.');
      return;
    }

    setIsSaving(true);
    try {
      await authService.changePassword(current, next);
      onClose();
      showToast('Password updated');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Change Password"
      icon="Lock"
      size="sm"
      footer={
        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" fullWidth onPress={onClose} disabled={isSaving} />
          <Button title="Update Password" variant="primary" fullWidth loading={isSaving} onPress={handleSubmit} />
        </View>
      }
    >
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
      </View>
    </Modal>
  );
}
