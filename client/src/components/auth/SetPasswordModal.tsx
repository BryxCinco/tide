import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/toastStore';
import { setPasswordSchema, type SetPasswordForm } from '../../utils/validation';
import { Button, Input, Modal, Text } from '../ui';

/**
 * Prompted once, right after a Google sign-in completes, for any account that only has a
 * Google identity (see authStore's completeGoogleSignIn + googleAuth.service.ts's
 * hasOnlyGoogleIdentity). Mounted once in app/_layout.tsx (same pattern as Toast) so it can
 * appear regardless of which screen the user lands on post-sign-in — driven entirely by
 * authStore's `needsPasswordSetup`, no props needed.
 */
export function SetPasswordModal() {
  const needsPasswordSetup = useAuthStore((s) => s.needsPasswordSetup);
  const setPassword = useAuthStore((s) => s.setPassword);
  const skipPasswordSetup = useAuthStore((s) => s.skipPasswordSetup);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSkip = async () => {
    await skipPasswordSetup();
    reset();
  };

  const onSubmit = async (data: SetPasswordForm) => {
    setIsSaving(true);
    try {
      await setPassword(data.password);
      reset();
      showToast('Password set!');
    } catch (err) {
      showToast(getApiErrorMessage(err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={needsPasswordSetup}
      onClose={handleSkip}
      title="Set a password for faster sign-in"
      icon="Lock"
      size="sm"
      footer={
        <View className="gap-3">
          <Button title="Set Password" variant="primary" size="lg" fullWidth loading={isSaving} onPress={handleSubmit(onSubmit)} />
          <Pressable onPress={handleSkip} hitSlop={8} className="items-center">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              Skip for now
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-5">
        <Text variant="body" color="secondary">
          You can still use Google anytime.
        </Text>

        <View className="gap-4">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                label="Password"
                placeholder="At least 8 characters"
                icon="Lock"
                secureTextEntry
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                icon="Lock"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
