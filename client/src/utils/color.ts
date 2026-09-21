/**
 * Custom activities carry an arbitrary hex color, not a fixed Tailwind class — so tinting
 * their icon circles has to go through inline `style`, computed at runtime from the hex.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const value = parseInt(full, 16);

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
