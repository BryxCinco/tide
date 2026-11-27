import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { WaveLevel } from '../../types/insights';
import { ocean } from '../../utils/theme';

/** Display name and signature color per wave level (tsunami also gets the aurora). */
export const WAVE_META: Record<WaveLevel, { label: string; color: string; deep: string }> = {
  low: { label: 'Low', color: '#94A3B8', deep: '#475569' },
  mid: { label: 'Mid', color: ocean.aqua, deep: '#0E7490' },
  high: { label: 'High', color: ocean.lagoon, deep: '#0F766E' },
  tsunami: { label: 'Tsunami', color: '#6366F1', deep: '#312E81' },
};

/**
 * Hand-drawn wave silhouettes on a 64×64 canvas, one per level, so a week reads at a glance:
 * a flat ripple, a rolling swell, a tall peaked breaker, and a curling tsunami with foam.
 * The back wave is the same shape, offset and faded, for depth.
 */
const SHAPES: Record<WaveLevel, string> = {
  low: 'M0 47 C 8 44, 14 44, 21 46 C 28 48, 34 48, 41 46 C 48 44, 55 44, 64 46 V64 H0 Z',
  mid: 'M0 46 C 8 40, 16 32, 27 33 C 37 34, 41 43, 50 41 C 56 40, 60 35, 64 34 V64 H0 Z',
  high: 'M0 52 C 9 49, 15 36, 24 24 C 31 15, 41 12, 47 18 C 51 23, 47 29, 41 26 C 44 35, 53 43, 64 44 V64 H0 Z',
  tsunami:
    'M0 58 C 6 52, 9 34, 19 20 C 28 7, 47 2, 57 11 C 64 17, 62 29, 53 30 C 46 31, 43 24, 48 19 C 41 19, 37 27, 39 36 C 41 46, 52 52, 64 52 V64 H0 Z',
};

export interface WaveGlyphProps {
  level: WaveLevel;
  size?: number;
  /** Fade the glyph (e.g. while loading). */
  dim?: boolean;
}

export function WaveGlyph({ level, size = 44, dim = false }: WaveGlyphProps) {
  // SVG gradient ids are global on web — make them unique per glyph.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const meta = WAVE_META[level];
  const fillId = `wave-fill-${uid}`;
  const isTsunami = level === 'tsunami';

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" opacity={dim ? 0.35 : 1}>
      <Defs>
        {isTsunami ? (
          <LinearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#14B8A6" />
            <Stop offset="0.5" stopColor="#06B6D4" />
            <Stop offset="1" stopColor="#6366F1" />
          </LinearGradient>
        ) : (
          <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={meta.color} />
            <Stop offset="1" stopColor={meta.deep} />
          </LinearGradient>
        )}
      </Defs>
      {/* Back wave: same silhouette, shifted and faded. */}
      <Path d={SHAPES[level]} fill={meta.color} opacity={0.28} transform="translate(-7 3)" />
      <Path d={SHAPES[level]} fill={`url(#${fillId})`} />
      {isTsunami && (
        <>
          <Circle cx={58} cy={7} r={2.2} fill="#E0F2FE" />
          <Circle cx={62} cy={14} r={1.5} fill="#E0F2FE" />
          <Circle cx={50} cy={4} r={1.3} fill="#E0F2FE" />
        </>
      )}
      {level === 'high' && <Circle cx={49} cy={14} r={1.4} fill="#CCFBF1" />}
    </Svg>
  );
}
