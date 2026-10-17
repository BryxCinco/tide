import { useThemeStore } from '../../store/themeStore';

/**
 * One set of chart tokens for every Insights graph, so they read as a family: a single teal
 * series color, a softer step of the same hue for de-emphasized marks, hairline grids one
 * step off the surface, and a 5-step teal ramp for magnitude (heatmap). Values differ per
 * theme — dark mode gets its own steps, not an automatic flip.
 */
export interface ChartTheme {
  /** The series / emphasis color. */
  accent: string;
  /** De-emphasized marks of the same series (non-selected bars). */
  accentSoft: string;
  /** Solid hairline for gridlines and baselines. */
  grid: string;
  /** Matches bg-surface — used for the 2px gap/ring that separates touching marks. */
  surface: string;
  /** Empty track of rings and meters. */
  track: string;
  tooltipBg: string;
  tooltipText: string;
  /** Sequential teal ramp, level 0 (none) -> 4 (heaviest). */
  heat: [string, string, string, string, string];
  /** Task status colors — the gray "to do" is a deliberate neutral ("not started") and is
   * always shown with a text label and count, never by color alone. */
  status: { done: string; 'in-progress': string; todo: string; overdue: string };
}

const LIGHT: ChartTheme = {
  accent: '#14B8A6',
  accentSoft: '#99F6E4',
  grid: '#EEF2F6',
  surface: '#FFFFFF',
  track: '#EEF2F6',
  tooltipBg: '#0F172A',
  tooltipText: '#F8FAFC',
  heat: ['#EEF2F6', '#99F6E4', '#2DD4BF', '#0D9488', '#115E59'],
  status: { done: '#14B8A6', 'in-progress': '#6366F1', todo: '#94A3B8', overdue: '#EF4444' },
};

const DARK: ChartTheme = {
  accent: '#2DD4BF',
  accentSoft: 'rgba(45, 212, 191, 0.32)',
  grid: 'rgba(255, 255, 255, 0.07)',
  surface: '#121823',
  track: 'rgba(255, 255, 255, 0.08)',
  tooltipBg: '#F8FAFC',
  tooltipText: '#0F172A',
  heat: ['#1B2230', '#134E4A', '#0F766E', '#14B8A6', '#5EEAD4'],
  status: { done: '#0D9488', 'in-progress': '#6366F1', todo: '#64748B', overdue: '#EF4444' },
};

export function useChartTheme(): ChartTheme {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  return isDark ? DARK : LIGHT;
}

/** Rounds a seconds maximum up to a clean axis top with a midpoint tick — whole hours when
 * the max is at least an hour, otherwise 15-minute steps. */
export function niceTimeTicks(maxSeconds: number): { top: number; ticks: { value: number; label: string }[] } {
  if (maxSeconds >= 3600) {
    const step = Math.max(1, Math.ceil(maxSeconds / 3600 / 2)) * 3600;
    return {
      top: step * 2,
      ticks: [0, step, step * 2].map((v) => ({ value: v, label: v === 0 ? '0' : `${v / 3600}h` })),
    };
  }
  const step = Math.max(1, Math.ceil(maxSeconds / 60 / 2 / 15)) * 15 * 60;
  return {
    top: step * 2,
    ticks: [0, step, step * 2].map((v) => ({ value: v, label: v === 0 ? '0' : `${v / 60}m` })),
  };
}
