import { forwardRef } from 'react';
import { Pressable as RNPressable, type View } from 'react-native';
import type { PressableProps } from 'react-native';

import { soundManager } from '../../utils/soundManager';

/**
 * Drop-in replacement for react-native's `Pressable`, imported in its place across the app
 * (`import { Pressable } from '../ui/SoundPressable'` instead of `'react-native'`) so every
 * clickable surface — nav items, list rows, filter chips, toggles, modal option rows,
 * pickers — gets the same tap sound Button.tsx already plays, without threading
 * `soundManager` into 200+ individual onPress handlers by hand. Only fires when the caller
 * actually passed an `onPress` (a Pressable used purely for hover-tracking, with no press
 * handler, stays silent), and never fires while `disabled` since RN skips onPress entirely
 * in that case. Button.tsx, Card.tsx, NavItem.tsx and ChatPanel.tsx wire the sound manually
 * instead of importing this, so they intentionally keep using plain react-native Pressable.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({ onPress, ...rest }, ref) {
  return (
    <RNPressable
      ref={ref}
      onPress={
        onPress
          ? (event) => {
              soundManager.play('tap');
              onPress(event);
            }
          : undefined
      }
      {...rest}
    />
  );
});
