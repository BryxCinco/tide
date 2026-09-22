import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type ImageSource = 'camera' | 'library';

export type PickImageResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'permission-denied' | 'too-large' | 'unsupported' };

const MAX_BYTES = 2 * 1024 * 1024;

/** Camera capture isn't meaningful on a browser tab the way it is on a phone (`launchCameraAsync`
 * has no web implementation) — callers should hide the "Take Photo" option on web rather than
 * let a user tap it and see this rejection, but this stays a safety net either way. */
function isCameraSupported(): boolean {
  return Platform.OS !== 'web';
}

async function ensurePermission(source: ImageSource): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Picks an image and resolves it to a base64 `data:` URI, not the raw `file://`/`blob:` URI
 * the picker itself returns. A `blob:` URL (web) dies as soon as the page reloads, and a
 * `file://` path (native) isn't guaranteed to stay valid forever either — a data URI is
 * self-contained, so it round-trips through persisted storage (userStore -> authStore's
 * `storage.setItem`) exactly like any other string field, with nothing extra to manage.
 * The tradeoff is size: base64 is ~33% larger than the original bytes, which is exactly why
 * there's a 2MB cap here rather than storing full-resolution originals.
 */
export async function pickImage(source: ImageSource): Promise<PickImageResult> {
  if (source === 'camera' && !isCameraSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const granted = await ensurePermission(source);
  if (!granted) return { ok: false, reason: 'permission-denied' };

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  };

  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]?.base64) {
    return { ok: false, reason: 'cancelled' };
  }

  const asset = result.assets[0];
  const approxBytes = asset.fileSize ?? asset.base64!.length * 0.75;
  if (approxBytes > MAX_BYTES) {
    return { ok: false, reason: 'too-large' };
  }

  const mime = asset.mimeType ?? 'image/jpeg';
  return { ok: true, uri: `data:${mime};base64,${asset.base64}` };
}
