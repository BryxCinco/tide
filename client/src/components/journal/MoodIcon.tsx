import { View } from 'react-native';

import type { Mood } from '../../types/journal';
import { hexToRgba } from '../../utils/color';
import { Icon, type IconName } from '../ui';

/** Icon + color + label per mood — replaces the emoji mapping everywhere in the app. */
export const MOOD_ICON_MAP: Record<Mood, { icon: IconName; color: string; label: string }> = {
  terrible: { icon: 'Frown', color: '#EF4444', label: 'Terrible' },
  bad: { icon: 'Meh', color: '#F59E0B', label: 'Bad' },
  okay: { icon: 'Minus', color: '#6B7280', label: 'Okay' },
  good: { icon: 'Smile', color: '#0EA5E9', label: 'Good' },
  great: { icon: 'Laugh', color: '#14B8A6', label: 'Great' },
};

export interface MoodIconProps {
  mood: Mood;
  size?: number;
  /** Renders the icon inside a tinted circular badge (mood color at 10% opacity) instead of bare. */
  badge?: boolean;
  badgeSize?: number;
  className?: string;
}

export function MoodIcon({ mood, size = 18, badge = false, badgeSize = 32, className }: MoodIconProps) {
  const config = MOOD_ICON_MAP[mood];

  if (!badge) {
    return <Icon name={config.icon} size={size} color={config.color} className={className} />;
  }

  return (
    <View
      className={className}
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: badgeSize / 2,
        backgroundColor: hexToRgba(config.color, 0.1),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={config.icon} size={size} color={config.color} />
    </View>
  );
}
