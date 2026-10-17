import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { gradientDirections, gradients } from '../../utils/gradients';
import { Icon } from '../ui';

/**
 * Floating action button for the AI Coach — navigates to the full-page /chat screen at every
 * screen width. It sits still (no idle bobbing or pulsing, which made the page feel restless)
 * and only reacts to the pointer: a small lift on hover and a squash on press.
 */
export function ChatbotFAB() {
  const size = Platform.OS === 'web' ? 60 : 56;
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);

  const animateTo = (value: number) => {
    scale.value = withTiming(value, { duration: 160, easing: Easing.out(Easing.ease) });
  };

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: '#06B6D4',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: hovered ? 0.45 : 0.3,
          shadowRadius: 20,
          elevation: 8,
        },
        scaleStyle,
      ]}
    >
      <Pressable
        onPress={() => router.push('/chat')}
        onHoverIn={() => {
          setHovered(true);
          animateTo(1.05);
        }}
        onHoverOut={() => {
          setHovered(false);
          animateTo(1);
        }}
        onPressIn={() => animateTo(0.94)}
        onPressOut={() => animateTo(hovered ? 1.05 : 1)}
        accessibilityLabel="Open AI Coach"
        style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={[...gradients.aurora]}
          {...gradientDirections.diagonal}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View>
            <Icon name="Sparkles" size={size * 0.42} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
