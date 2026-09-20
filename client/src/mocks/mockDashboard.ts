import type {
  FocusActivity,
  HeroFocus,
  JournalPreview,
  QuickActionItem,
  StatItem,
  TimeLogEntry,
} from '../types/dashboard';

export const mockHeroFocus: HeroFocus = {
  label: 'Deep Work Session',
  subtitle: '4 hours planned · Focus mode ready',
};

export const mockStats: StatItem[] = [
  { id: 'focus-time', label: 'Focus Time Today', value: '2h 14m', icon: 'Clock', tint: 'teal', trend: '+18%' },
  { id: 'sessions', label: 'Sessions', value: '4 today', icon: 'Target', tint: 'blue', trend: '+2' },
  { id: 'streak', label: 'Streak', value: '12 days', icon: 'Flame', tint: 'purple', trend: 'Personal best!' },
  { id: 'mood', label: 'Mood', value: 'Productive', icon: 'Smile', tint: 'muted' },
];

export const mockFocusScore = 68;

export const mockFocusActivities: FocusActivity[] = [
  { id: 'deep-work', label: 'Deep Work', duration: '2h 14m', percentage: 65, tint: 'teal' },
  { id: 'meetings', label: 'Meetings', duration: '45m', percentage: 22, tint: 'blue' },
  { id: 'learning', label: 'Learning', duration: '20m', percentage: 10, tint: 'purple' },
  { id: 'break', label: 'Break', duration: '8m', percentage: 3, tint: 'muted' },
];

export const mockQuickActions: QuickActionItem[] = [
  { id: 'start-timer', label: 'Start Timer', icon: 'Play', tint: 'teal', href: '/timer' },
  { id: 'write-journal', label: 'Write Journal', icon: 'PenLine', tint: 'blue', href: '/journal/new' },
  { id: 'view-insights', label: 'View Insights', icon: 'BarChart3', tint: 'purple', href: '/insights' },
  { id: 'chat-coach', label: 'Chat with Coach', icon: 'MessageCircle', tint: 'teal', href: '#chat' },
];

export const mockRecentActivity: TimeLogEntry[] = [
  { id: '1', activity: 'Deep Work', icon: 'Brain', tint: 'teal', startTime: '9:00 AM', endTime: '11:14 AM', duration: '2h 14m' },
  { id: '2', activity: 'Team Meeting', icon: 'Users', tint: 'blue', startTime: '11:30 AM', endTime: '12:15 PM', duration: '45m' },
  { id: '3', activity: 'Reading', icon: 'BookOpen', tint: 'purple', startTime: '1:00 PM', endTime: '1:20 PM', duration: '20m' },
  { id: '4', activity: 'Coffee Break', icon: 'Coffee', tint: 'muted', startTime: '1:20 PM', endTime: '1:28 PM', duration: '8m' },
];

export const mockRecentJournal: JournalPreview[] = [
  {
    id: '1',
    date: 'Today',
    title: 'Finally shipped the auth flow',
    preview:
      'Spent the morning wiring up guest mode — felt really good to see it all click together after days of work.',
    mood: 'Motivated',
    tags: ['Work', 'Milestone'],
  },
  {
    id: '2',
    date: 'Yesterday',
    title: 'Slow start, strong finish',
    preview:
      'Struggled to focus in the morning but the afternoon deep work block more than made up for it.',
    mood: 'Reflective',
    tags: ['Focus'],
  },
  {
    id: '3',
    date: '2 days ago',
    title: 'Trying a new routine',
    preview:
      'Started blocking my calendar in 90-minute chunks. Curious to see how this affects my energy.',
    tags: ['Experiment'],
  },
];
