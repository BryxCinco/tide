import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '../../i18n';
import { colors } from '../../utils/theme';
import { Button, Icon, Input, Modal, Text } from '../ui';

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  /** Actually deleting an account needs a backend, which doesn't exist yet — the confirm
   * button stays wired up (this isn't a dead-end placeholder), but what it does today is
   * caller-defined, e.g. logging the guest/account out locally. */
  onConfirm: () => void;
}

const CONFIRM_WORD = 'DELETE';

/** Irreversible-action modal: typing the exact confirm word is what enables the Delete
 * button, not just a checkbox — same "make it deliberately a little effortful" pattern as
 * most account-deletion flows, so a stray tap can't trigger it. */
export function DeleteAccountModal({ visible, onClose, onConfirm }: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!visible) setConfirmText('');
  }, [visible]);

  const canDelete = confirmText.trim() === CONFIRM_WORD;

  return (
    <Modal visible={visible} onClose={onClose} title="Delete Account" icon="UserX" tone="danger" size="sm">
      <View className="gap-5">
        <View className="flex-row gap-3 rounded-xl border border-error/20 bg-error/5 p-3">
          <Icon name="TriangleAlert" size={18} color={colors.status.error} />
          <Text variant="body" color="secondary" className="flex-1 normal-case tracking-normal">
            This permanently deletes your account and all of your activities, tasks, and journal entries. This can't be undone.
          </Text>
        </View>

        <Input
          label={`Type ${CONFIRM_WORD} to confirm`}
          placeholder={CONFIRM_WORD}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <View className="flex-row gap-3">
          <Button title={t('common.cancel')} variant="secondary" fullWidth onPress={onClose} />
          <Button title={t('profile.deleteAccount')} variant="danger" fullWidth disabled={!canDelete} onPress={onConfirm} />
        </View>
      </View>
    </Modal>
  );
}
