import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CoverPhoto, CoverPicker } from '../dashboard';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import { Avatar, BackButton, Icon, ResponsiveContainer, Text } from '../ui';

export interface ProfileCoverProps {
  /** The avatar's camera badge opens AvatarPickerModal (real upload now — see
   * AvatarPickerModal.tsx), not EditProfileModal; editing name/bio/email is reached
   * through the Account section's own "Edit Profile" row instead. */
  onAvatarPress: () => void;
}

/**
 * Facebook/LinkedIn-style header: full-bleed cover photo with the avatar overlapping its
 * bottom-left edge, name/handle underneath. Reuses `CoverPhoto`/`CoverPicker` straight from
 * the Dashboard (same cover data — `user.coverType`/`coverValue` via userStore.updateCover)
 * instead of building a second copy, so changing the cover here and on the Dashboard is
 * the same action with the same picker. The back button floats over the cover itself
 * (semi-opaque circle, same treatment `CoverPhoto`'s own camera button already uses)
 * rather than sitting in a separate header row above it — that row was the first thing to
 * go when trimming vertical space back for actual content.
 */
export function ProfileCover({ onAvatarPress }: ProfileCoverProps) {
  const { user, isGuest } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const { isDesktop, isTablet } = useResponsive();

  const coverType = user?.coverType ?? 'gradient';
  const coverValue = user?.coverValue ?? DEFAULT_COVER_GRADIENT_ID;
  const coverHeight = isDesktop ? 180 : isTablet ? 160 : 140;
  const avatarSize = isDesktop ? 96 : 80;
  const avatarWrapperSize = avatarSize + 6;
  const avatarOverlap = avatarSize / 2 + 4;

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <CoverPhoto coverType={coverType} coverValue={coverValue} height={coverHeight} onPress={() => setPickerVisible(true)} />
        <BackButton onPress={() => router.push('/')} className="absolute left-4 top-4 z-20 bg-base/90" />
      </View>

      <ResponsiveContainer>
        <View className="flex-row items-end justify-between" style={{ marginTop: -avatarOverlap }}>
          <Pressable onPress={onAvatarPress} className="relative">
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
            <View
              className="absolute bottom-0.5 right-0.5 items-center justify-center rounded-full border-2 border-base bg-tide-teal"
              style={{ width: 28, height: 28 }}
            >
              <Icon name="Camera" size={13} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <View className="mt-3 gap-0.5 pb-1">
          <Text variant="h2" color="primary">
            {user?.name ?? 'Guest'}
          </Text>
          <Text variant="body" color="muted" className="normal-case tracking-normal">
            {isGuest ? 'Guest session' : user?.email}
          </Text>
          {user?.bio && (
            <Text variant="body" color="secondary" numberOfLines={2} className="mt-1 max-w-md normal-case tracking-normal">
              {user.bio}
            </Text>
          )}
        </View>
      </ResponsiveContainer>

      <CoverPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentType={coverType} currentValue={coverValue} />
    </View>
  );
}
