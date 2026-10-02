import { View } from 'react-native';

import { useTranslation } from '../../i18n';
import { Button, Modal, Text } from '../ui';

export interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Plain confirm dialog, not `confirmAsync` — `confirmAsync` is a fire-and-forget
 * `Alert`/`window.confirm` (fine for a quick "delete this task?"), but the Phase 8 spec
 * calls for a themed modal here, matching the rest of Profile's UI instead of the OS's
 * native dialog chrome. */
export function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Log out?"
      icon="LogOut"
      tone="danger"
      size="sm"
      footer={
        <View className="flex-row gap-3">
          <Button title={t('common.cancel')} variant="secondary" className="flex-1" onPress={onClose} />
          {/* Silent — logging out is a plain, no-fanfare action, not something to celebrate
              with the usual tap click. */}
          <Button title={t('nav.logout')} variant="danger" className="flex-1" sound={false} onPress={onConfirm} />
        </View>
      }
    >
      <View className="gap-5">
        <Text variant="body" color="secondary" className="normal-case tracking-normal">
          You'll need to sign in again to get back to your dashboard.
        </Text>
      </View>
    </Modal>
  );
}
