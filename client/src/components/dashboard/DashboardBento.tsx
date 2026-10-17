import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { COVER_GRADIENTS, DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import type { FocusActivity } from '../../types/dashboard';
import { gradientDirections, gradients } from '../../utils/gradients';
import { getFormattedDate, getGreeting } from '../../utils/greeting';
import { Avatar, BENTO_INK_TEXT, BentoTile, FadeInView, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { CoverPicker } from './CoverPicker';

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

function GlassButton({ icon, label, onPress, solid = false }: { icon: IconName; label: string; onPress: () => void; solid?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-10 flex-row items-center gap-2 rounded-full px-4"
      style={{
        backgroundColor: solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.16)',
        borderWidth: 1,
        borderColor: solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.28)',
      }}
    >
      <Icon name={icon} size={15} color={solid ? '#0F766E' : '#FFFFFF'} strokeWidth={2.3} />
      <Text variant="body" className="text-[13px] font-semibold" style={{ color: solid ? '#0F766E' : '#FFFFFF' }}>
        {label}
      </Text>
    </Pressable>
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
    <FadeInView index={index} className={className} style={{ minHeight: isPhone ? 230 : 260 }}>
      <View className="flex-1 overflow-hidden rounded-[24px]">
        {coverType === 'image' && coverValue ? (
          <Image source={{ uri: coverValue }} style={FILL} resizeMode="cover" />
        ) : coverType === 'solid' ? (
          <View style={[FILL, { backgroundColor: coverValue || '#14B8A6' }]} />
        ) : (
          <LinearGradient colors={gradient.colors} {...gradientDirections.diagonal} style={FILL} />
        )}
        {/* Darkens toward the bottom so white text stays readable on any cover. */}
        <LinearGradient
          colors={['rgba(2, 6, 23, 0.05)', 'rgba(2, 6, 23, 0.35)', 'rgba(2, 6, 23, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={FILL}
          pointerEvents="none"
        />
        {/* Faint ring motif — TIDE's "ripple" signature, purely decorative. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -70, top: -70, width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }} />

        <View className="flex-1 justify-between gap-6 p-5 md:p-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <Icon name="CalendarDays" size={13} color="#FFFFFF" />
              <Text variant="body" className="text-[12px] font-medium" style={{ color: '#FFFFFF' }}>
                {getFormattedDate()}
              </Text>
            </View>
            <Pressable
              onPress={() => setPickerVisible(true)}
              accessibilityLabel="Change cover"
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <Icon name="Camera" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="gap-4">
            <Pressable onPress={() => router.push('/(tabs)/profile')} className="flex-row items-center gap-3 self-start">
              <View className="rounded-full p-[3px]" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}>
                <Avatar name={user?.name} source={user?.avatar} style={{ width: isPhone ? 48 : 56, height: isPhone ? 48 : 56 }} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <View className="flex-row items-center gap-2">
                  <Text variant="body" className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {user?.name ?? 'Demo User'}
                  </Text>
                  {isGuest && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                      <Text variant="label" style={{ color: '#FFFFFF', fontSize: 9 }}>
                        Demo
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant={isPhone ? 'h2' : 'h1'} style={{ color: '#FFFFFF' }} numberOfLines={2}>
                  {greetingLine}
                </Text>
              </View>
            </Pressable>

            <View className="flex-row flex-wrap gap-2">
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

const SEGMENT_COLORS = ['#14B8A6', '#06B6D4', '#6366F1', '#A78BFA', '#F59E0B'];

export interface FocusTodayTileProps {
  totalLabel: string;
  sessionsCount: number;
  /** % of the day so far spent in tracked sessions. */
  focusScore: number;
  activities: FocusActivity[];
  className?: string;
  index?: number;
}

/** The dark "statement" tile: today's tracked time, a segmented bar of where it went, and
 * a legend of the top activities. */
export function FocusTodayTile({ totalLabel, sessionsCount, focusScore, activities, className, index }: FocusTodayTileProps) {
  const hasData = sessionsCount > 0;
  const top = activities.slice(0, 3);

  return (
    <BentoTile tone="ink" className={className} index={index}>
      <View className="flex-1 justify-between gap-5">
        <View className="flex-row items-center justify-between">
          <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
            Today&apos;s focus
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(20,184,166,0.18)' }}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#2DD4BF' }} />
            <Text variant="body" className="text-[11px] font-semibold" style={{ color: '#5EEAD4' }}>
              {focusScore}% of day
            </Text>
          </View>
        </View>

        <View>
          <Text variant="display" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
            {totalLabel}
          </Text>
          <Text variant="body" className="mt-1 text-[13px]" style={{ color: BENTO_INK_TEXT.secondary }}>
            {hasData ? `${sessionsCount} session${sessionsCount === 1 ? '' : 's'} tracked today` : 'Nothing tracked yet — your first session starts the day.'}
          </Text>
        </View>

        {hasData ? (
          <View className="gap-3">
            <View className="h-2.5 flex-row gap-1 overflow-hidden rounded-full">
              {activities.map((activity, i) => (
                <View
                  key={activity.id}
                  style={{ flex: Math.max(activity.percentage, 4), backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length], borderRadius: 999 }}
                />
              ))}
            </View>
            <View className="gap-1.5">
              {top.map((activity, i) => (
                <View key={activity.id} className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                  <Text variant="body" className="flex-1 text-[13px]" style={{ color: BENTO_INK_TEXT.secondary }} numberOfLines={1}>
                    {activity.label}
                  </Text>
                  <Text variant="body" className="text-[13px] font-semibold" style={{ color: BENTO_INK_TEXT.primary }}>
                    {activity.duration}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/timer')} className="h-10 flex-row items-center justify-center gap-2 self-start overflow-hidden rounded-full px-4">
            <LinearGradient colors={[...gradients.aurora]} {...gradientDirections.horizontal} style={FILL} />
            <View>
              <Icon name="Timer" size={15} color="#FFFFFF" />
            </View>
            <Text variant="body" className="text-[13px] font-semibold" style={{ color: '#FFFFFF' }}>
              Open the timer
            </Text>
          </Pressable>
        )}
      </View>
    </BentoTile>
  );
}
