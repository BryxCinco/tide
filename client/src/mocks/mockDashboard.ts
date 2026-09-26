import type {
  FocusActivity,
  HeroFocus,
  JournalPreview,
  QuickActionItem,
  StatItem,
  TimeLogEntry,
} from '../types/dashboard';

/** Fresh-start copy — no fake "4 hours planned" narrative for a user who hasn't tracked
 * anything yet. app/(tabs)/index.tsx swaps this for a live "X tracked today" subtitle once
 * todaySessions has something in it. */
export const mockHeroFocus: HeroFocus = {
  label: 'Ready to focus?',
  subtitle: 'Start your first session to get going.',
};

/** No longer used directly — app/(tabs)/index.tsx computes StatsRow's stats live from
 * timerStore/taskStore/questStore instead, so a brand-new account shows real zeros rather
 * than these fabricated numbers. Kept only as the StatItem[] type's shape reference. */
export const mockStats: StatItem[] = [];

export const mockFocusScore = 0;

export const mockFocusActivities: FocusActivity[] = [];

/** Static navigation shortcuts, not user data — nothing here to zero out. */
export const mockQuickActions: QuickActionItem[] = [
  { id: 'start-timer', label: 'Start Timer', icon: 'Play', tint: 'teal', href: '/timer' },
  { id: 'write-journal', label: 'Write Journal', icon: 'PenLine', tint: 'blue', href: '/journal/new' },
  { id: 'view-insights', label: 'View Insights', icon: 'BarChart3', tint: 'purple', href: '/insights' },
  { id: 'chat-coach', label: 'Chat with Coach', icon: 'Sparkles', tint: 'teal', href: '/chat' },
];

export const mockRecentActivity: TimeLogEntry[] = [];

export const mockRecentJournal: JournalPreview[] = [];
