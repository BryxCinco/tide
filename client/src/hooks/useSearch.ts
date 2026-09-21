import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import type { IconName } from '../components/ui';
import { useJournalStore } from '../store/journalStore';
import { useSearchStore, type RecentItemType } from '../store/searchStore';
import { useTaskStore } from '../store/taskStore';

export type SuggestionCategory = 'pages' | 'actions' | 'recent';

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  /** What kind of thing this is, for persisting to searchStore's MRU on select. */
  type: RecentItemType;
  icon: IconName;
  title: string;
  subtitle?: string;
  route: string;
}

export interface SuggestionGroup {
  category: SuggestionCategory;
  label: string;
  items: Suggestion[];
}

interface StaticEntry {
  id: string;
  title: string;
  icon: IconName;
  route: string;
}

const PAGES: StaticEntry[] = [
  { id: 'page-dashboard', title: 'Dashboard', icon: 'Home', route: '/' },
  { id: 'page-timer', title: 'Timer', icon: 'Clock', route: '/timer' },
  { id: 'page-journal', title: 'Journal', icon: 'Book', route: '/journal' },
  { id: 'page-tasks', title: 'Tasks', icon: 'CheckSquare', route: '/tasks' },
  { id: 'page-activities', title: 'Activities', icon: 'Layers', route: '/activities' },
  { id: 'page-insights', title: 'Insights', icon: 'BarChart3', route: '/insights' },
  { id: 'page-profile', title: 'Profile', icon: 'User', route: '/profile' },
  { id: 'page-settings', title: 'Settings', icon: 'Settings', route: '/profile' },
];

// Same routes QuickActions.tsx already uses for these — matched deliberately, since that
// component establishes the convention that a "create" action just navigates to the
// screen with the New button, rather than a search-only shortcut that pre-opens a modal
// nothing else in the app does either.
const ACTIONS: StaticEntry[] = [
  { id: 'action-start-timer', title: 'Start Timer', icon: 'Play', route: '/timer' },
  { id: 'action-new-journal', title: 'New Journal Entry', icon: 'PenLine', route: '/journal/new' },
  { id: 'action-new-task', title: 'New Task', icon: 'ListPlus', route: '/tasks' },
  { id: 'action-new-activity', title: 'New Activity', icon: 'Plus', route: '/activities' },
  { id: 'action-track-mood', title: 'Track Mood', icon: 'Smile', route: '/journal/new' },
  { id: 'action-view-habits', title: 'View Habits', icon: 'Repeat', route: '/' },
];

function includesQuery(query: string, title: string): boolean {
  return !query || title.toLowerCase().includes(query);
}

/** Below this many characters, no suggestions are shown at all (not even recent/MRU) —
 * see MIN_QUERY_LENGTH's use in useSearch below. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Filtering/matching logic behind both SearchBar (inline) and SearchModal (Cmd+K) — one
 * source of truth so the two surfaces can't drift into showing different results for the
 * same query. Suggestions only appear once the query reaches MIN_QUERY_LENGTH — below
 * that, this returns an empty array and the caller shows a "keep typing" hint instead.
 * That intentionally makes searchStore's recentItems MRU (still written on every select,
 * see useSearchController below) currently unreachable for display — there's no empty-
 * query state left in which to surface it. Left in place rather than ripped out, in case
 * a future "recent" affordance elsewhere in the app wants it.
 */
export function useSearch(query: string): SuggestionGroup[] {
  const journalEntries = useJournalStore((s) => s.entries);
  const tasks = useTaskStore((s) => s.tasks);

  return useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return [];
    }
    const q = trimmed.toLowerCase();

    const pages: Suggestion[] = PAGES.filter((p) => includesQuery(q, p.title)).map((p) => ({
      ...p,
      category: 'pages',
      type: 'page',
    }));

    const actions: Suggestion[] = ACTIONS.filter((a) => includesQuery(q, a.title)).map((a) => ({
      ...a,
      category: 'actions',
      type: 'action',
    }));

    const matchingJournal: Suggestion[] = journalEntries
      .filter((e) => includesQuery(q, e.title))
      .slice(0, 3)
      .map((e) => ({
        id: `recent-journal-${e.id}`,
        category: 'recent',
        type: 'journal',
        icon: 'Book',
        title: e.title,
        subtitle: 'Journal entry',
        route: `/journal/${e.id}`,
      }));

    const matchingTasks: Suggestion[] = tasks
      .filter((t) => includesQuery(q, t.title))
      .slice(0, 3)
      .map((t) => ({
        id: `recent-task-${t.id}`,
        category: 'recent',
        type: 'task',
        icon: 'CheckSquare',
        title: t.title,
        subtitle: 'Task',
        route: '/tasks',
      }));

    const groups: SuggestionGroup[] = [
      { category: 'pages', label: 'Pages', items: pages },
      { category: 'actions', label: 'Actions', items: actions },
      { category: 'recent', label: 'Recent', items: [...matchingJournal, ...matchingTasks] },
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [query, journalEntries, tasks]);
}

export interface SearchController {
  query: string;
  setQuery: (query: string) => void;
  activeIndex: number;
  groups: SuggestionGroup[];
  flatItems: Suggestion[];
  select: (item: Suggestion) => void;
  /** Feed the TextInput's onKeyPress `key` string straight through (ArrowUp/ArrowDown/Enter/Escape). */
  handleKey: (key: string) => void;
  reset: () => void;
}

/**
 * Shared stateful glue behind SearchBar and SearchModal — query/active-index state,
 * arrow-key navigation over the flattened suggestion list, and what happens on select
 * (record to searchStore's MRU, navigate, clear). Kept here rather than duplicated in
 * both components so the two surfaces can't drift in behavior.
 */
export function useSearchController(onAfterAction?: () => void): SearchController {
  const [query, setQueryState] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const addRecentItem = useSearchStore((s) => s.addRecentItem);
  const groups = useSearch(query);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const setQuery = (next: string) => {
    setQueryState(next);
    setActiveIndex(0);
  };

  const reset = () => {
    setQueryState('');
    setActiveIndex(0);
  };

  const select = (item: Suggestion) => {
    addRecentItem({ type: item.type, id: item.id, title: item.title, route: item.route });
    router.push(item.route as Href);
    reset();
    onAfterAction?.();
  };

  const handleKey = (key: string) => {
    if (key === 'ArrowDown') {
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (key === 'ArrowUp') {
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (key === 'Enter') {
      const item = flatItems[activeIndex];
      if (item) select(item);
    } else if (key === 'Escape') {
      reset();
      onAfterAction?.();
    }
  };

  return { query, setQuery, activeIndex, groups, flatItems, select, handleKey, reset };
}
