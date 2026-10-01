import { Image, View } from 'react-native';

import { Modal } from '../ui';

export interface PhotoViewerModalProps {
  visible: boolean;
  onClose: () => void;
  uri: string | null;
}

/** Full-size tap-to-view for a journal photo thumbnail — `size="full"` so the image gets as
 * much room as possible on every platform, not just phone. */
export function PhotoViewerModal({ visible, onClose, uri }: PhotoViewerModalProps) {
  return (
    <Modal visible={visible && Boolean(uri)} onClose={onClose} size="full">
      <View className="flex-1 items-center justify-center">
        {uri && <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />}
      </View>
    </Modal>
  );
}
