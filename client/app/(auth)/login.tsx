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

import { Button, Divider, Input, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginForm } from '@/utils/validation';

export default function LoginScreen() {
  const { login, loginAsGuest, isLoading, error, clearError } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    clearError();
    try {
      await login(data.email, data.password);
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
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full self-center" style={{ maxWidth: 400 }}>
            <View className="mb-10 items-center">
              <Text variant="display" color="primary">
                TIDE
              </Text>
              <Text variant="body" color="muted" className="mt-1 text-center">
                Your Personal Productivity Coach
              </Text>
            </View>

            <Text variant="h2" color="primary" className="mb-1">
              Welcome back
            </Text>
            <Text variant="body" color="muted" className="mb-6">
              Sign in to continue
            </Text>

            <View className="gap-4">
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
                    placeholder="Enter your password"
                    icon="Lock"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.password?.message}
                  />
                )}
              />
            </View>

            <Pressable className="mb-6 mt-2 self-end" onPress={() => {}} hitSlop={8}>
              <Text variant="caption" color="accent" className="normal-case tracking-normal">
                Forgot password?
              </Text>
            </Pressable>

            {error && (
              <View className="mb-4 rounded-md border border-error/30 bg-error/10 px-3 py-2">
                <RNText className="text-caption text-error">{error}</RNText>
              </View>
            )}

            <Button title="Sign In" size="lg" fullWidth loading={isLoading} onPress={handleSubmit(onSubmit)} />

            <Divider label="OR" spacing="lg" />

            <Button title="Continue with Google" variant="secondary" fullWidth icon="Globe" onPress={() => {}} />

            <Button
              title="Continue as Guest"
              variant="ghost"
              fullWidth
              icon="UserCircle"
              onPress={handleGuestLogin}
              className="mt-3"
            />
            <Text variant="caption" color="muted" className="mt-2 text-center normal-case tracking-normal">
              Your data will be saved on this device only
            </Text>

            <View className="mb-8 mt-8 flex-row justify-center gap-1">
              <Text variant="body" color="muted">
                Don&apos;t have an account?
              </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text variant="body" color="accent" className="font-medium">
                    Sign Up
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
