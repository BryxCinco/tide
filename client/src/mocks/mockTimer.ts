import type { Session } from '../types/timer';

export const INTEREST_TAGS: string[] = [
  'Productive',
  'Creative',
  'Learning',
  'Collaborative',
  'Focused',
  'Energizing',
];

// Mirrors Phase 4's dashboard "Recent Activity" mock numbers (2h14m / 45m / 20m / 8m) for continuity.
// Colors match the seed activities in mockActivities.ts (deep-work/meetings/learning/break).
export const mockTodaySessions: Session[] = [
  {
    id: '1',
    activityId: 'deep-work',
    activityLabel: 'Deep Work',
    icon: 'Brain',
    color: '#14B8A6',
    startTime: '9:00 AM',
    endTime: '11:14 AM',
    durationSeconds: 2 * 3600 + 14 * 60,
    tags: ['Focused'],
  },
  {
    id: '2',
    activityId: 'meetings',
    activityLabel: 'Meetings',
    icon: 'Users',
    color: '#0EA5E9',
    startTime: '11:30 AM',
    endTime: '12:15 PM',
    durationSeconds: 45 * 60,
    tags: ['Collaborative'],
  },
  {
    id: '3',
    activityId: 'learning',
    activityLabel: 'Learning',
    icon: 'BookOpen',
    color: '#8B5CF6',
    startTime: '1:00 PM',
    endTime: '1:20 PM',
    durationSeconds: 20 * 60,
    tags: ['Learning'],
  },
  {
    id: '4',
    activityId: 'break',
    activityLabel: 'Coffee Break',
    icon: 'Coffee',
    color: '#6B7280',
    startTime: '1:20 PM',
    endTime: '1:28 PM',
    durationSeconds: 8 * 60,
    tags: [],
  },
];
