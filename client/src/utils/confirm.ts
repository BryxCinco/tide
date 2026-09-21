import { Alert, Platform } from 'react-native';

/** Cross-platform confirm dialog — react-native-web has no Alert.alert, so web falls back to window.confirm. */
export function confirmAsync(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirmed = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false;
    return Promise.resolve(confirmed);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
