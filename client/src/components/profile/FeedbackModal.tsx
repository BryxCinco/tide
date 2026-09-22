import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { showToast } from '../../store/toastStore';
import { Button, Input, Modal, Text } from '../ui';

export interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const FEEDBACK_MAX_LENGTH = 1000;

/** No backend to submit to yet — this validates and clears its own state (so reopening
 * shows a blank form, not the last submission) and shows a toast, same "no backend, be
 * honest about it" treatment as Delete Account. Email defaults to the signed-in user's,
 * editable in case they'd rather be reached elsewhere. */
export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMessage('');
    setEmail(user?.email ?? '');
    setError(null);
  }, [visible, user]);

  const handleSubmit = () => {
    if (!message.trim()) {
      setError('Let us know what you think before sending.');
      return;
    }
    onClose();
    showToast('Thanks for your feedback!');
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Send Feedback" icon="MessageSquare" size="md">
      <View className="gap-5">
        <View className="gap-1">
          <Input
            label="Your feedback"
            placeholder="What's working well? What could be better?"
            value={message}
            onChangeText={(text) => {
              setMessage(text.slice(0, FEEDBACK_MAX_LENGTH));
              if (error) setError(null);
            }}
            multiline
            error={error ?? undefined}
          />
          <Text variant="caption" color="muted" className="self-end normal-case tracking-normal">
            {message.length}/{FEEDBACK_MAX_LENGTH}
          </Text>
        </View>

        <Input label="Email (optional)" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <View className="flex-row gap-3">
          <Button title="Cancel" variant="secondary" fullWidth onPress={onClose} />
          <Button title="Submit" variant="primary" fullWidth onPress={handleSubmit} />
        </View>
      </View>
    </Modal>
  );
}
