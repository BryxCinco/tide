import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton, Button, Card, Icon, Input, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/utils/theme';
import { registerSchema, type RegisterForm } from '@/utils/validation';

/** react-native-web doesn't implement Alert.alert — fall back to window.alert there. */
function showSuccessMessage(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
    return;
  }
  Alert.alert('Success', message);
}

export default function LinkAccountScreen() {
  const { linkGuestToAccount, isLoading, error, clearError } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', terms: false },
  });

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    try {
      await linkGuestToAccount(data.name, data.email, data.password);
      showSuccessMessage('Your data has been saved to your account!');
      router.replace('/');
    } catch {
      // Failure is surfaced via useAuth().error below.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow px-4 py-6 md:px-6 lg:px-8" keyboardShouldPersistTaps="handled">
          <BackButton className="mb-6" />

          <View className="w-full self-center" style={{ maxWidth: 400 }}>
            <View className="mb-6 items-center">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-tide-teal/10">
                <Icon name="Sparkles" size={26} color={colors.brand.tideTeal} />
              </View>
              <Text variant="h2" color="primary" className="text-center">
                Save Your Progress
              </Text>
              <Text variant="body" color="muted" className="mt-1 text-center">
                Create an account to back up your data and access it from any device.
              </Text>
            </View>

            <Card variant="outlined" className="mb-6 border-accent bg-tide-teal/5">
              <Text variant="body" color="secondary">
                Your guest data will be transferred to your new account.
              </Text>
            </Card>

            <View className="gap-4">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    label="Name"
                    placeholder="Your name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    ref={emailRef}
                    label="Email"
                    placeholder="you@example.com"
                    icon="Mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <Input
                    ref={passwordRef}
                    label="Password"
                    placeholder="Create a password"
                    icon="Lock"
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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
                    ref={confirmPasswordRef}
                    label="Confirm password"
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

            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <Pressable
                  className="mt-4 flex-row items-start gap-3"
                  onPress={() => field.onChange(!field.value)}
                  hitSlop={8}
                >
                  <View
                    className={
                      field.value
                        ? 'mt-0.5 h-5 w-5 items-center justify-center rounded border border-tide-teal bg-tide-teal'
                        : 'mt-0.5 h-5 w-5 items-center justify-center rounded border border-default bg-base'
                    }
                  >
                    {field.value && <Icon name="Check" size={14} color={colors.text.inverse} />}
                  </View>
                  <RNText className="flex-1 text-body text-secondary">
                    I agree to the Terms of Service and Privacy Policy
                  </RNText>
                </Pressable>
              )}
            />
            {errors.terms && <RNText className="mt-1.5 text-caption text-error">{errors.terms.message}</RNText>}

            {error && (
              <View className="mt-4 rounded-md border border-error/30 bg-error/10 px-3 py-2">
                <RNText className="text-caption text-error">{error}</RNText>
              </View>
            )}

            <Button
              title="Create Account & Save Data"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
              className="mt-6"
            />

            <Pressable onPress={() => router.replace('/')} hitSlop={8} className="mb-8 mt-6 self-center">
              <RNText className="text-body text-muted">Skip for now</RNText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
