import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Source art is 961x400 (assets/logo-wordmark.png) — used directly rather than computed from
// an Image.getSize() round trip, since this ratio is fixed for a bundled, never-changing asset.
const ASPECT_RATIO = 961 / 400;

export interface AuthLogoProps {
  /** Rendered width in px — height follows the source image's own aspect ratio, so this is
   * the only dimension callers need to pick. */
  width?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * The TIDE wordmark (icon + "TiDE" text), shown at the top of every auth screen in place of a
 * plain "TIDE" text heading. Tightly cropped to its own content (assets/logo-wordmark.png) —
 * deliberately a separate asset from assets/splash-icon.png, which pads the same art onto a
 * square canvas for the native splash screen and would otherwise render mostly empty space
 * here. A bundled `require()`, not a remote `{ uri }` — the only static local image this app
 * references this way (everywhere else, Image sources are user content).
 */
export function AuthLogo({ width = 160, style }: AuthLogoProps) {
  return (
    <Image
      source={require('../../../assets/logo-wordmark.png')}
      style={[{ width, height: width / ASPECT_RATIO, alignSelf: 'center' }, style]}
      resizeMode="contain"
      accessibilityLabel="TIDE"
    />
  );
}
