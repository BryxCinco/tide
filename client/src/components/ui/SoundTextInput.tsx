import { forwardRef } from 'react';
import { TextInput as RNTextInput, type TextInput as RNTextInputHandle, type TextInputProps } from 'react-native';

import { cn } from '../../utils/cn';
import { soundManager } from '../../utils/soundManager';
import { colors } from '../../utils/theme';

/**
 * Drop-in replacement for react-native's `TextInput` (same pattern as SoundPressable.tsx) —
 * plays the throttled typing sound on every keystroke and sets the teal cursor/selection
 * color, so every raw TextInput in the app (chat composer, search bars, tag input, journal
 * editor) gets both without threading `soundManager` + `selectionColor` into each
 * `onChangeText` by hand. Input.tsx — the shared labeled-field primitive most forms use —
 * wires both directly instead of importing this, since it already owns its TextInput's
 * props fully and has its own focus-ring/error chrome around it.
 */
export const TextInput = forwardRef<RNTextInputHandle, TextInputProps>(function TextInput(
  { onChangeText, selectionColor, cursorColor, className, ...rest },
  ref,
) {
  return (
    <RNTextInput
      ref={ref}
      onChangeText={(text) => {
        soundManager.play('typing');
        onChangeText?.(text);
      }}
      selectionColor={selectionColor ?? colors.brand.tideTeal}
      cursorColor={cursorColor ?? colors.brand.tideTeal}
      className={cn(className, 'caret-tide-teal outline-none')}
      {...rest}
    />
  );
});
