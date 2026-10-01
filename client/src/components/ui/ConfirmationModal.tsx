import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Modal, type ModalSize } from './Modal';
import { Text } from './Text';

export type ConfirmationModalVariant = 'success' | 'warning' | 'danger' | 'info';

export interface ConfirmationAction {
  label: string;
  onPress: () => void;
}

export interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  icon?: IconName;
  /** Overrides the variant's default color for both the icon and its badge background. */
  iconColor?: string;
  title: string;
  message: string;
  /** Rendered as the solid primary Button. */
  primaryAction?: ConfirmationAction;
  /** Rendered as a secondary (outlined) Button, above primaryAction. */
  secondaryAction?: ConfirmationAction;
  /** Rendered as a plain ghost/text Button, above secondaryAction — for a third, lowest-
   * emphasis option (e.g. "Create Another" between a primary "Done" and no second action). */
  tertiaryAction?: ConfirmationAction;
  /** Tints the icon badge; 'danger' also makes primaryAction a danger-variant Button. */
  variant?: ConfirmationModalVariant;
  /** Closes the modal on its own after this many ms if the user hasn't acted — same pattern
   * as Toast's auto-dismiss. Cancelled on unmount/re-open so it never fires against a stale
   * modal instance. */
  autoDismissMs?: number;
  size?: ModalSize;
}

/**
 * Generic centered icon + title + message + up to 3 stacked actions, for the lightweight
 * "X created!" / "Log out?" confirmations introduced in Phase 13 Fix 2 — distinct from the
 * base Modal's own title-bar icon (which only supports two tones), so each variant gets its
 * own real color (teal/amber/red/blue) rather than being squeezed into accent-or-danger.
 */
export function ConfirmationModal({
  visible,
  onClose,
  icon,
  iconColor,
  title,
  message,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  variant = 'info',
  autoDismissMs,
  size = 'sm',
}: ConfirmationModalProps) {
  const themeColors = useThemeColors();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const variantColor: Record<ConfirmationModalVariant, string> = {
    success: themeColors.status.success,
    warning: themeColors.status.warning,
    danger: themeColors.status.error,
    info: themeColors.status.info,
  };
  const color = iconColor ?? variantColor[variant];

  useEffect(() => {
    if (!visible || !autoDismissMs) return;
    const timeout = setTimeout(() => onCloseRef.current(), autoDismissMs);
    return () => clearTimeout(timeout);
  }, [visible, autoDismissMs]);

  return (
    <Modal visible={visible} onClose={onClose} size={size}>
      <View className="items-center gap-4">
        {icon && (
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
            <Icon name={icon} size={30} color={color} />
          </View>
        )}

        <View className="items-center gap-1.5">
          <Text variant="h3" color="primary" className="text-center">
            {title}
          </Text>
          <Text variant="body" color="secondary" className="text-center">
            {message}
          </Text>
        </View>

        <View className="w-full gap-2.5 pt-2">
          {primaryAction && (
            <Button
              title={primaryAction.label}
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              onPress={primaryAction.onPress}
            />
          )}
          {secondaryAction && <Button title={secondaryAction.label} variant="secondary" size="lg" fullWidth onPress={secondaryAction.onPress} />}
          {tertiaryAction && <Button title={tertiaryAction.label} variant="ghost" size="md" fullWidth onPress={tertiaryAction.onPress} />}
        </View>
      </View>
    </Modal>
  );
}
