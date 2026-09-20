import { forwardRef, useState } from 'react';
import { Pressable, Text as RNText, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface InputProps
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'keyboardType'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'testID'
    | 'onSubmitEditing'
    | 'returnKeyType'
  > {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  /** Called (with no event) when the field loses focus — matches React Hook Form's `field.onBlur`. */
  onBlur?: () => void;
  error?: string;
  secureTextEntry?: boolean;
  /** Icon rendered at the start of the field. */
  icon?: IconName;
  /** Icon rendered at the end of the field. Ignored when `secureTextEntry` is set. */
  rightIcon?: IconName;
  editable?: boolean;
  multiline?: boolean;
  className?: string;
}

/** Text field with label, left/right icons, error state, and a password-visibility toggle. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    value,
    onChangeText,
    onBlur,
    placeholder,
    error,
    secureTextEntry = false,
    icon,
    rightIcon,
    editable = true,
    multiline = false,
    className,
    ...rest
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const hasError = Boolean(error);

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text variant="label" color="muted" className="mb-2">
          {label}
        </Text>
      )}

      <View
        className={cn(
          'flex-row items-center rounded-md border bg-base px-3',
          multiline ? 'min-h-24 items-start py-3' : 'h-11',
          hasError ? 'border-error' : isFocused ? 'border-accent' : 'border-default',
          !editable && 'opacity-50',
        )}
      >
        {icon && <Icon name={icon} size={18} color={colors.text.muted} className="mr-2" />}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          editable={editable}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          className="flex-1 font-sans text-body text-primary"
          style={multiline ? { textAlignVertical: 'top' } : undefined}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable onPress={() => setIsSecureVisible((v) => !v)} hitSlop={8}>
            <Icon name={isSecureVisible ? 'EyeOff' : 'Eye'} size={18} color={colors.text.muted} />
          </Pressable>
        ) : (
          rightIcon && <Icon name={rightIcon} size={18} color={colors.text.muted} />
        )}
      </View>

      {hasError && <RNText className="mt-1.5 text-caption text-error">{error}</RNText>}
    </View>
  );
});
