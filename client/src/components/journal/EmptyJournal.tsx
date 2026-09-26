import { EmptyState } from '../ui';

export interface EmptyJournalProps {
  /** True when a search query or filter is active and produced zero results. */
  hasActiveFilters: boolean;
  onNewEntry: () => void;
}

export function EmptyJournal({ hasActiveFilters, onNewEntry }: EmptyJournalProps) {
  if (hasActiveFilters) {
    return (
      <EmptyState
        icon="Search"
        title="No matching entries"
        description="Try a different search term, or clear your filters."
      />
    );
  }

  return (
    <EmptyState
      icon="BookOpen"
      title="No entries yet"
      description="Write your first journal!"
      actionLabel="New Entry"
      onAction={onNewEntry}
    />
  );
}
