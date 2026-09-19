import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-bg-light px-6">
        <Text className="text-lg font-semibold text-text-primary">
          This screen doesn't exist.
        </Text>
      </View>
    </>
  );
}
