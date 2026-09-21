import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * NativeWind only auto-wraps a small allowlist of third-party components (e.g.
 * react-native-safe-area-context's SafeAreaView) — react-native-reanimated's
 * `Animated.View`/`Animated.Text` are NOT in that list, so a bare `className` on them
 * is silently ignored (no style is ever produced). This was the actual cause of the
 * sidebar's "icon stacked above text" bug: NavItem's row wrapper is an `Animated.View`
 * with `className="flex-row items-center gap-3 ..."`, and none of that ever applied.
 *
 * `cssInterop(component, mapping)` registers the *exact* component reference into
 * NativeWind's global interop table, so every `<Animated.View className="...">` in the
 * app — not just ones in this file — starts working, as long as this module is
 * imported once before anything renders (see app/_layout.tsx's first import).
 */
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
