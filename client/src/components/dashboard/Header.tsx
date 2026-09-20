import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { getFormattedDate, getGreeting } from '../../utils/greeting';
import { colors } from '../../utils/theme';
import { Avatar, Icon, Text } from '../ui';

export interface HeaderProps {
  name: string;
  avatarSource?: string;
  hasUnreadNotifications?: boolean;
  onNotificationsPress?: () => void;
}

/** Greeting + date on the left, notification bell + avatar on the right. Stacks on mobile, row on web. */
export function Header({ name, avatarSource, hasUnreadNotifications = false, onNotificationsPress }: HeaderProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <View className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <View>
        <Text variant="h2" color="primary">
          {getGreeting()}, <Text variant="h2" color="accent">{firstName}</Text>
        </Text>
        <Text variant="caption" color="muted" className="mt-1 normal-case tracking-normal">
          {getFormattedDate()}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onNotificationsPress}
          hitSlop={8}
          className="relative h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="Bell" size={20} color={colors.text.secondary} />
          {hasUnreadNotifications && <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-tide-teal" />}
        </Pressable>

        <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={4}>
          <Avatar name={name} source={avatarSource} size="md" />
        </Pressable>
      </View>
    </View>
  );
}
