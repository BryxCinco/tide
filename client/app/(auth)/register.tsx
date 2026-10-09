import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthLogo } from '@/components/auth';
import { BackButton, Button, Divider, Icon, Input, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { colors } from '@/utils/theme';
import { getPasswordStrength, registerSchema, type PasswordStrength, type RegisterForm } from '@/utils/validation';

const strengthCopy: Record<PasswordStrength, { label: string; textClass: string; dotClass: string }> = {
  weak: { label: 'Weak', textClass: 'text-error', dotClass: 'bg-error' },
  medium: { label: 'Medium', textClass: 'text-warning', dotClass: 'bg-warning' },
  strong: { label: 'Strong', textClass: 'text-tide-teal', dotClass: 'bg-tide-teal' },
};

export default function RegisterScreen() {
  const { register: registerUser, loginAsGuest, isLoading, error, clearError } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', terms: false },
  });

  const password = watch('password');
  const strength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    try {
      await registerUser(data.name, data.email, data.password);
      router.replace('/');
    } catch {
      // Failure is surfaced via useAuth().error below.
    }
  };

  const handleGuestLogin = async () => {
    clearError();
    try {
      await loginAsGuest();
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
            <AuthLogo width={120} style={{ marginBottom: 20 }} />
            <Text variant="h1" color="primary" className="mb-1">
              Create Account
            </Text>
            <Text variant="body" color="muted" className="mb-6">
              Start your productivity journey
            </Text>

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

              <View>
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
                {strength && !errors.password && (
                  <View className="mt-1.5 flex-row items-center gap-1.5">
                    <View className={cn('h-1.5 w-1.5 rounded-full', strengthCopy[strength].dotClass)} />
                    <RNText className={cn('text-caption', strengthCopy[strength].textClass)}>
                      {strengthCopy[strength].label} password
                    </RNText>
                  </View>
                )}
              </View>

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
                    className={cn(
                      'mt-0.5 h-5 w-5 items-center justify-center rounded border',
                      field.value ? 'border-tide-teal bg-tide-teal' : 'border-default bg-base',
                    )}
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
              title="Create Account"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
              className="mt-6"
            />

            <Divider spacing="lg" />

            <Button
              title="Try Demo"
              variant="ghost"
              fullWidth
              icon="Sparkles"
              onPress={handleGuestLogin}
            />
            <Text variant="caption" color="muted" className="mt-2 text-center normal-case tracking-normal">
              Explore TIDE with sample data—no sign-up needed
            </Text>

            <View className="mb-8 mt-8 flex-row justify-center gap-1">
              <Text variant="body" color="muted">
                Already have an account?
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text variant="body" color="accent" className="font-medium">
                    Sign In
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
