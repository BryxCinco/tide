import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Activity } from '../../types/activity';
import { recurrenceBadgeLabel } from '../../utils/activityRecurrence';
import { hexToRgba } from '../../utils/color';
import { FadeInView, Icon, Text, type IconName } from '../ui';

export interface FavoriteActivityTileProps {
  activity: Activity;
  onPress: () => void;
  onToggleFavorite: () => void;
  index?: number;
  className?: string;
}

/** A favorite activity as a full-color tile — the activity's own color is the background,
 * with its icon large and faint in the corner. The library's most personal, most-used items
 * get the loudest treatment. */
export function FavoriteActivityTile({ activity, onPress, onToggleFavorite, index = 0, className }: FavoriteActivityTileProps) {
  const recurrence = recurrenceBadgeLabel(activity);

  return (
    <FadeInView index={index} className={className}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={`${activity.name} details`}
        className="h-[132px] overflow-hidden rounded-[22px] p-4"
        style={{
          shadowColor: activity.color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 3,
        }}
      >
        <LinearGradient
          colors={[activity.color, hexToRgba(activity.color, 0.72)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View pointerEvents="none" style={{ position: 'absolute', right: -14, bottom: -18, opacity: 0.2 }}>
          <Icon name={activity.icon as IconName} size={96} color="#FFFFFF" strokeWidth={1.5} />
        </View>

        <View className="flex-1 justify-between">
          <View className="flex-row items-start justify-between">
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
              <Icon name={activity.icon as IconName} size={20} color="#FFFFFF" />
            </View>
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={8}
              accessibilityLabel="Remove from favorites"
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Icon name="Star" size={15} color="#FFFFFF" fill="#FFFFFF" />
            </Pressable>
          </View>
          <View>
            <Text variant="body" className="text-[15px] font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
              {activity.name}
            </Text>
            <Text variant="body" className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
              {recurrence ?? (activity.category === 'custom' ? 'Custom activity' : 'Built-in')}
            </Text>
          </View>
        </View>
      </Pressable>
    </FadeInView>
  );
}
