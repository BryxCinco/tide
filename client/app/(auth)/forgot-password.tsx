import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthLogo } from '@/components/auth';
import { BackButton, Button, Icon, Input, Text } from '@/components/ui';
import { requestPasswordReset } from '@/services/passwordReset.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const themeColors = useThemeColors();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSending(true);
    try {
      await requestPasswordReset(data.email);
      // Shown regardless of whether this email actually has an account — see
      // passwordReset.service.ts's comment on why that's deliberate, not a bug.
      setSentTo(data.email);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow px-4 py-6 md:px-6 lg:px-8" keyboardShouldPersistTaps="handled">
          <BackButton className="mb-6" />

          <View className="w-full self-center" style={{ maxWidth: 400 }}>
            <AuthLogo width={120} style={{ marginBottom: 20 }} />
            {sentTo ? (
              <View className="items-center gap-4 py-8">
                <Icon name="MailCheck" size={40} color={themeColors.brand.tideTeal} />
                <Text variant="h2" color="primary" className="text-center">
                  Check your email
                </Text>
                <Text variant="body" color="muted" className="text-center">
                  If an account exists for {sentTo}, we&apos;ve sent a link to reset your password.
                </Text>
                <Button title="Back to Sign In" variant="secondary" fullWidth onPress={() => router.replace('/(auth)/login')} className="mt-4" />
              </View>
            ) : (
              <>
                <Text variant="h2" color="primary" className="mb-1">
                  Forgot your password?
                </Text>
                <Text variant="body" color="muted" className="mb-6">
                  Enter your email and we&apos;ll send you a link to reset it.
                </Text>

                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      label="Email"
                      placeholder="you@example.com"
                      icon="Mail"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.email?.message}
                    />
                  )}
                />

                <Button title="Send Reset Link" size="lg" fullWidth loading={isSending} onPress={handleSubmit(onSubmit)} className="mt-6" />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
