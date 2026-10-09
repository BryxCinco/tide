import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import { Avatar, Button, Icon, ResponsiveContainer, Text } from '../ui';
import { CoverPhoto } from './CoverPhoto';
import { CoverPicker } from './CoverPicker';

/** Notion-style header: full-width cover, an avatar overlapping its bottom edge, then
 * name/bio/edit — the centerpiece of the redesigned Dashboard. */
export function ProfileHeader() {
  const { user, isGuest } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const { isDesktop, isTablet } = useResponsive();

  const coverType = user?.coverType ?? 'gradient';
  const coverValue = user?.coverValue ?? DEFAULT_COVER_GRADIENT_ID;
  const coverHeight = isDesktop ? 160 : isTablet ? 140 : 120;
  const avatarSize = isDesktop ? 80 : 64;
  const avatarWrapperSize = avatarSize + 6; // 3px white border on each side
  const avatarOverlap = 40; // px the avatar rides up over the cover's bottom edge

  return (
    <View>
      <CoverPhoto coverType={coverType} coverValue={coverValue} height={coverHeight} onPress={() => setPickerVisible(true)} />

      {/* Same centered/max-width treatment as ResponsiveContainer everywhere else on the
          page (SearchBar, WidgetGrid) — previously this used raw edge-to-edge padding,
          so on a wide desktop viewport the avatar/name column sat flush against the
          screen's left edge while the search bar below it was centered in a 1200px
          column, making the two look misaligned/unrelated instead of stacked in one
          column. */}
      <ResponsiveContainer>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          onHoverIn={() => setAvatarHovered(true)}
          onHoverOut={() => setAvatarHovered(false)}
          className="self-start"
          style={{ marginTop: -avatarOverlap }}
        >
          <View
            className="items-center justify-center rounded-full bg-base"
            style={{ width: avatarWrapperSize, height: avatarWrapperSize }}
          >
            <Avatar
              name={user?.name}
              source={user?.avatar}
              ring
              ringColor="teal"
              style={{ width: avatarSize, height: avatarSize }}
            />
          </View>

          {avatarHovered && (
            <View
              className="absolute items-center justify-center rounded-full"
              style={{
                width: avatarWrapperSize,
                height: avatarWrapperSize,
                backgroundColor: 'rgba(17, 24, 39, 0.45)',
              }}
            >
              <Icon name="Camera" size={22} color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <View className="mt-2 gap-0.5 pb-2">
          <View className="flex-row items-center gap-2">
            <Text variant="h2" color="primary">
              {user?.name ?? 'Demo User'}
            </Text>
            {/* Replaces the old full-width "You're using TIDE as a guest..." banner that
                used to sit above the whole dashboard — it reset back to visible on every
                navigation/reload (its dismissal was never persisted) instead of actually
                going away, which read as broken rather than dismissible. This carries the
                same "you're a guest, here's how to keep this" message, but as a small,
                permanent badge next to the name instead of a recurring interruption. */}
            {isGuest && (
              <View className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5">
                <Text variant="caption" className="text-tide-teal normal-case tracking-normal">
                  Demo
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            {user?.bio ?? user?.email ?? 'Browsing in demo mode'}
          </Text>
          <View className="flex-row flex-wrap items-center">
            <Button
              title="Edit Profile"
              variant="ghost"
              size="sm"
              icon="Pencil"
              onPress={() => router.push('/(tabs)/profile')}
              className="mt-1"
            />
            {isGuest && (
              <Button
                title="Save Progress"
                variant="ghost"
                size="sm"
                icon="Save"
                onPress={() => router.push('/(auth)/link-account')}
                className="mt-1"
              />
            )}
          </View>
        </View>
      </ResponsiveContainer>

      <CoverPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentType={coverType} currentValue={coverValue} />
    </View>
  );
}
