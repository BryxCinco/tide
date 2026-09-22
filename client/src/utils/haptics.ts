import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptics.* throws on web (no native haptics engine) — every call site wraps through
 * this instead of calling expo-haptics directly, so a missed vibration never surfaces as
 * an error. Same "best-effort, never crashes" contract soundManager.ts established for
 * sound effects. */
export function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

export function hapticNotification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(type).catch(() => {});
}

export { Haptics };
