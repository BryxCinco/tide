import { Fragment } from 'react';
import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { hexToRgba } from '../../utils/color';
import { FadeInView, useGlassSurface } from './Bento';
import { Icon, type IconName } from './Icon';
import { Pressable } from './SoundPressable';
import { Text } from './Text';

export interface StatStripItem {
  id: string;
  icon: IconName;
  color: string;
  value: string;
  label: string;
  /** 0–1; draws a thin bar under the value (e.g. XP to next level, tasks done). */
  progress?: number;
  onPress?: () => void;
}

export interface StatStripProps {
  items: StatStripItem[];
  index?: number;
  className?: string;
}

/**
 * Focus-first stats: one slim glass tile with every number in a row (two per row on phone),
 * instead of a separate card per stat pushing the page's real content down.
 */
export function StatStrip({ items, index = 0, className }: StatStripProps) {
  const glass = useGlassSurface();
  const { isPhone } = useResponsive();

  return (
    <FadeInView index={index} className={className}>
      <View className="flex-row flex-wrap rounded-[20px] border px-1.5 py-1.5" style={glass}>
        {items.map((item, i) => {
          const body = (
            <View className="flex-row items-center gap-2.5 px-2.5 py-2">
              <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(item.color, 0.14) }}>
                <Icon name={item.icon} size={14} color={item.color} />
              </View>
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text variant="body" color="primary" className="text-[18px] font-bold leading-[22px]" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                  {item.value}
                </Text>
                <Text variant="body" color="muted" className="text-[11.5px]" numberOfLines={1}>
                  {item.label}
                </Text>
                {item.progress !== undefined && (
                  <View className="mt-1 h-[3px] overflow-hidden rounded-full bg-[rgba(100,116,139,0.18)]">
                    <View className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, item.progress)) * 100)}%`, backgroundColor: item.color }} />
                  </View>
                )}
              </View>
              {item.onPress && <Icon name="ChevronRight" size={14} />}
            </View>
          );
          return (
            <Fragment key={item.id}>
              {i > 0 && !isPhone && <View className="my-2 w-px bg-[rgba(100,116,139,0.16)]" />}
              <View style={{ flexBasis: isPhone ? '50%' : 0, flexGrow: 1, minWidth: 0 }}>
                {item.onPress ? (
                  <Pressable onPress={item.onPress} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}`} className="rounded-2xl hover:bg-[rgba(100,116,139,0.07)]">
                    {body}
                  </Pressable>
                ) : (
                  body
                )}
              </View>
            </Fragment>
          );
        })}
      </View>
    </FadeInView>
  );
}
