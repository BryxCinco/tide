import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, Input, Text } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { confirmPasswordReset } from '@/services/passwordReset.service';
import { showToast } from '@/store/toastStore';
import { setPasswordSchema, type SetPasswordForm } from '@/utils/validation';

/**
 * Landed on from the link in a password-reset email (see passwordReset.service.ts's
 * requestPasswordReset) — never navigated to directly from in-app. The `code` param is a
 * one-time-use PKCE recovery code; see confirmPasswordReset for what it's exchanged for.
 */
export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const themeColors = useThemeColors();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SetPasswordForm) => {
    if (!code) return;
    setIsSaving(true);
    try {
      await confirmPasswordReset(code, data.password);
      setIsDone(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not reset your password.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const goToLogin = () => router.replace('/(auth)/login');

  // No code at all means this screen was opened directly rather than from a real email
  // link — same end state as an expired/already-used one, so one message covers both.
  if (!code || isDone) {
    return (
      <SafeAreaView className="flex-1 bg-base">
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Icon
            name={isDone ? 'CircleCheck' : 'CircleAlert'}
            size={40}
            color={isDone ? themeColors.brand.tideTeal : themeColors.status.error}
          />
          <Text variant="h2" color="primary" className="text-center">
            {isDone ? 'Password reset!' : 'Invalid or expired link'}
          </Text>
          <Text variant="body" color="muted" className="text-center">
            {isDone
              ? 'You can now sign in with your new password.'
              : 'This reset link is no longer valid. Request a new one from the Sign In screen.'}
          </Text>
          <Button title="Back to Sign In" variant="primary" onPress={goToLogin} className="mt-2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-4 py-12 md:px-6 lg:px-8" keyboardShouldPersistTaps="handled">
          <View className="w-full self-center" style={{ maxWidth: 400 }}>
            <Text variant="h2" color="primary" className="mb-1">
              Set a new password
            </Text>
            <Text variant="body" color="muted" className="mb-6">
              Choose a new password for your account.
            </Text>

            <View className="gap-4">
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <Input
                    label="New Password"
                    placeholder="At least 8 characters"
                    icon="Lock"
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
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
                    ref={confirmRef}
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

            <Button title="Reset Password" size="lg" fullWidth loading={isSaving} onPress={handleSubmit(onSubmit)} className="mt-6" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
