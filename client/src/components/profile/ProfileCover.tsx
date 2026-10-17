import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { CoverPicker } from '../dashboard/CoverPicker';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { COVER_GRADIENTS, DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import { gradientDirections } from '../../utils/gradients';
import { Avatar, FadeInView, Icon, Text } from '../ui';

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

export interface ProfileCoverProps {
  /** The avatar's camera badge opens AvatarPickerModal. */
  onAvatarPress: () => void;
  /** "Edit profile" button — name, bio and email. */
  onEditPress: () => void;
  className?: string;
}

/**
 * Profile identity as a bento tile: the user's own cover (shared with the Dashboard's
 * greeting tile and the same CoverPicker) fills the tile, with the avatar, name, email/bio
 * and an Edit profile action on top of a bottom shade that keeps white text readable.
 */
export function ProfileCover({ onAvatarPress, onEditPress, className }: ProfileCoverProps) {
  const { user, isGuest } = useAuth();
  const { isPhone } = useResponsive();
  const [pickerVisible, setPickerVisible] = useState(false);

  const coverType = user?.coverType ?? 'gradient';
  const coverValue = user?.coverValue ?? DEFAULT_COVER_GRADIENT_ID;
  const gradient = COVER_GRADIENTS.find((g) => g.id === coverValue) ?? COVER_GRADIENTS[0];
  const avatarSize = isPhone ? 72 : 84;

  return (
    <FadeInView index={0} className={className} style={{ minHeight: isPhone ? 240 : 250 }}>
      <View className="flex-1 overflow-hidden rounded-[24px]">
        {coverType === 'image' && coverValue ? (
          <Image source={{ uri: coverValue }} style={FILL} resizeMode="cover" />
        ) : coverType === 'solid' ? (
          <View style={[FILL, { backgroundColor: coverValue || '#14B8A6' }]} />
        ) : (
          <LinearGradient colors={gradient.colors} {...gradientDirections.diagonal} style={FILL} />
        )}
        <LinearGradient
          colors={['rgba(2, 6, 23, 0)', 'rgba(2, 6, 23, 0.3)', 'rgba(2, 6, 23, 0.72)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={FILL}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
        />

        <View className="flex-1 justify-between gap-6 p-5 md:p-6">
          <View className="flex-row items-center justify-between">
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <Text variant="body" className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>
                {isGuest ? 'Demo account' : 'Your profile'}
              </Text>
            </View>
            <Pressable
              onPress={() => setPickerVisible(true)}
              accessibilityLabel="Change cover"
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Icon name="ImagePlus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="flex-row items-end gap-4">
            <Pressable onPress={onAvatarPress} accessibilityLabel="Change photo" className="relative">
              <View className="rounded-full p-[3px]" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <Avatar name={user?.name} source={user?.avatar} style={{ width: avatarSize, height: avatarSize }} />
              </View>
              <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-tide-teal">
                <Icon name="Camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>

            <View className="flex-1 gap-0.5" style={{ minWidth: 0 }}>
              <Text variant={isPhone ? 'h2' : 'h1'} style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {user?.name ?? 'Demo User'}
              </Text>
              <Text variant="body" className="text-[13px]" style={{ color: 'rgba(255,255,255,0.82)' }} numberOfLines={1}>
                {isGuest ? 'Demo session' : user?.email}
              </Text>
              {user?.bio && (
                <Text variant="body" className="text-[13px]" style={{ color: 'rgba(255,255,255,0.82)' }} numberOfLines={2}>
                  {user.bio}
                </Text>
              )}
            </View>

            {!isPhone && (
              <Pressable onPress={onEditPress} className="h-10 flex-row items-center gap-2 rounded-full bg-white px-4">
                <Icon name="Pencil" size={14} color="#0F766E" />
                <Text variant="body" className="text-[13px] font-semibold" style={{ color: '#0F766E' }}>
                  Edit profile
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <CoverPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} currentType={coverType} currentValue={coverValue} />
    </FadeInView>
  );
}
