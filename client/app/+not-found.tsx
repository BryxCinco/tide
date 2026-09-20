import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-base px-6">
        <Text className="font-semibold text-lg text-primary">
          This screen doesn't exist.
        </Text>
      </View>
    </>
  );
}
