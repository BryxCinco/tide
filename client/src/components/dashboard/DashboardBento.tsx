import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { COVER_GRADIENTS, DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import type { FocusActivity } from '../../types/dashboard';
import { gradientDirections, gradients } from '../../utils/gradients';
import { getFormattedDate, getGreeting } from '../../utils/greeting';
import { ocean } from '../../utils/theme';
import { Avatar, BENTO_INK_TEXT, BentoTile, FadeInView, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { CoverPicker } from './CoverPicker';

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

function GlassButton({ icon, label, onPress, solid = false }: { icon: IconName; label: string; onPress: () => void; solid?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-8 flex-row items-center gap-1.5 rounded-full px-3"
      style={{
        backgroundColor: solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.14)',
        borderWidth: 1,
        borderColor: solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.24)',
      }}
    >
      <Icon name={icon} size={13} color={solid ? '#0F766E' : '#FFFFFF'} strokeWidth={2.4} />
      <Text variant="body" className="text-[12px] font-semibold" style={{ color: solid ? '#0F766E' : '#FFFFFF' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Two layered swells along the bottom edge — TIDE's wave signature. Purely decorative. */
function Swells() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={76}
      viewBox="0 0 400 76"
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
    >
      <Path d="M0 38 C 60 18, 120 18, 180 34 S 300 58, 400 30 L 400 76 L 0 76 Z" fill="rgba(255,255,255,0.08)" />
      <Path d="M0 54 C 70 40, 140 44, 210 56 S 330 70, 400 50 L 400 76 L 0 76 Z" fill="rgba(255,255,255,0.10)" />
    </Svg>
  );
}

/**
 * The Dashboard's opening tile — the user's own cover (gradient, color or photo) as the
 * background, with their avatar, a time-of-day greeting and the two most common next steps.
 * Replaces the old full-width cover banner + separate "Today's Focus" hero card.
 */
export function GreetingTile({ className, index }: { className?: string; index?: number }) {
  const { user, isGuest } = useAuth();
  const { isPhone } = useResponsive();
  const [pickerVisible, setPickerVisible] = useState(false);

  const coverType = user?.coverType ?? 'gradient';
  const coverValue = user?.coverValue ?? DEFAULT_COVER_GRADIENT_ID;
  const gradient = COVER_GRADIENTS.find((g) => g.id === coverValue) ?? COVER_GRADIENTS[0];
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there';
  const greeting = getGreeting();
  const greetingLine = greeting.endsWith('?') ? `${greeting.slice(0, -1)}, ${firstName}?` : `${greeting}, ${firstName}`;

  return (
    <FadeInView index={index} className={className} style={{ minHeight: isPhone ? 184 : 196 }}>
      <View className="flex-1 overflow-hidden rounded-[20px]">
        {coverType === 'image' && coverValue ? (
          <Image source={{ uri: coverValue }} style={FILL} resizeMode="cover" />
        ) : coverType === 'solid' ? (
          <View style={[FILL, { backgroundColor: coverValue || ocean.lagoon }]} />
        ) : (
          <LinearGradient colors={gradient.colors} {...gradientDirections.diagonal} style={FILL} />
        )}
        {/* Deepens toward the bottom-left, where the text sits, so it stays readable on any cover. */}
        <LinearGradient
          colors={['rgba(3, 20, 26, 0)', 'rgba(3, 20, 26, 0.28)', 'rgba(3, 20, 26, 0.62)']}
          start={{ x: 0.9, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={FILL}
          pointerEvents="none"
        />
        <Swells />

        <View className="flex-1 justify-between gap-4 p-4 md:p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Icon name="CalendarDays" size={12} color="#FFFFFF" />
              <Text variant="body" className="text-[11px] font-medium" style={{ color: '#FFFFFF' }}>
                {getFormattedDate()}
              </Text>
            </View>
            <Pressable
              onPress={() => setPickerVisible(true)}
              accessibilityLabel="Change cover"
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            >
              <Icon name="Camera" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="gap-3">
            <Pressable onPress={() => router.push('/(tabs)/profile')} className="flex-row items-center gap-3 self-start">
              <View className="rounded-full p-[2px]" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}>
                <Avatar name={user?.name} source={user?.avatar} style={{ width: isPhone ? 40 : 44, height: isPhone ? 40 : 44 }} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <View className="flex-row items-center gap-1.5">
                  <Text variant="body" className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    {user?.name ?? 'Demo User'}
                  </Text>
                  {isGuest && (
                    <View className="rounded-full px-1.5 py-px" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                      <Text variant="label" style={{ color: '#FFFFFF', fontSize: 9 }}>
                        Demo
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="h2" className={isPhone ? 'text-[22px] leading-[27px]' : 'text-[26px] leading-[31px]'} style={{ color: '#FFFFFF' }} numberOfLines={2}>
                  {greetingLine}
                </Text>
              </View>
            </Pressable>

            <View className="flex-row flex-wrap gap-1.5">
              <GlassButton icon="Play" label="Start session" solid onPress={() => router.push('/timer')} />
              <GlassButton icon="PenLine" label="Write" onPress={() => router.push('/journal/new')} />
              {isGuest && <GlassButton icon="Save" label="Save progress" onPress={() => router.push('/(auth)/link-account')} />}
            </View>
          </View>
        </View>
      </View>

      <CoverPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentType={coverType} currentValue={coverValue} />
    </FadeInView>
  );
}

const SEGMENT_COLORS = [ocean.lagoon, ocean.aqua, ocean.surf, ocean.lavender, ocean.sand];

export interface FocusTodayTileProps {
  totalLabel: string;
  sessionsCount: number;
  /** % of the day so far spent in tracked sessions. */
  focusScore: number;
  activities: FocusActivity[];
  className?: string;
  index?: number;
}

/** The deep-sea "statement" tile: today's tracked time, a segmented bar of where it went,
 * and a legend of the top activities. */
export function FocusTodayTile({ totalLabel, sessionsCount, focusScore, activities, className, index }: FocusTodayTileProps) {
  const hasData = sessionsCount > 0;
  const top = activities.slice(0, 3);

  return (
    <BentoTile tone="deep" dense className={className} index={index}>
      <View className="flex-1 justify-between gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Icon name="Waves" size={13} color={ocean.seafoam} strokeWidth={2.2} />
            <Text variant="label" className="text-[10.5px] tracking-[0.8px]" style={{ color: BENTO_INK_TEXT.muted }}>
              Today&apos;s focus
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(94,234,212,0.14)' }}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ocean.seafoam }} />
            <Text variant="body" className="text-[10.5px] font-semibold" style={{ color: ocean.seafoam }}>
              {focusScore}% of day
            </Text>
          </View>
        </View>

        <View>
          <Text variant="display" className="text-[32px] leading-[36px]" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
            {totalLabel}
          </Text>
          <Text variant="body" className="mt-0.5 text-[12px]" style={{ color: BENTO_INK_TEXT.secondary }} numberOfLines={2}>
            {hasData ? `${sessionsCount} session${sessionsCount === 1 ? '' : 's'} tracked today` : 'Calm waters so far — your first session starts the day.'}
          </Text>
        </View>

        {hasData ? (
          <View className="gap-2">
            <View className="h-1.5 flex-row gap-0.5 overflow-hidden rounded-full">
              {activities.map((activity, i) => (
                <View
                  key={activity.id}
                  style={{ flex: Math.max(activity.percentage, 4), backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length], borderRadius: 999 }}
                />
              ))}
            </View>
            <View className="gap-1">
              {top.map((activity, i) => (
                <View key={activity.id} className="flex-row items-center gap-2">
                  <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                  <Text variant="body" className="flex-1 text-[12px]" style={{ color: BENTO_INK_TEXT.secondary }} numberOfLines={1}>
                    {activity.label}
                  </Text>
                  <Text variant="body" className="text-[12px] font-semibold" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                    {activity.duration}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/timer')} className="h-8 flex-row items-center justify-center gap-1.5 self-start overflow-hidden rounded-full px-3">
            <LinearGradient colors={[...gradients.aurora]} {...gradientDirections.horizontal} style={FILL} />
            <View>
              <Icon name="Timer" size={13} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <Text variant="body" className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>
              Open the timer
            </Text>
          </Pressable>
        )}
      </View>
    </BentoTile>
  );
}
