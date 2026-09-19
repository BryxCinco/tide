import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-light">
      <Text className="text-lg font-semibold text-text-primary">
        TIDE setup complete
      </Text>
      <Text className="mt-2 text-sm text-text-secondary">
        Time · Interest · Diary · Entries
      </Text>
    </View>
  );
}
