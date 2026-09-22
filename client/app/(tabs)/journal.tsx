import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyJournal, JournalCard, JournalFilters, SearchBar } from '@/components/journal';
import { BackButton, FAB, ResponsiveContainer, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { getVisibleEntries, useJournalStore } from '@/store/journalStore';

const SEARCH_DEBOUNCE_MS = 300;

export default function JournalScreen() {
  const allEntries = useJournalStore((s) => s.entries);
  const filter = useJournalStore((s) => s.filter);
  const moodFilter = useJournalStore((s) => s.moodFilter);
  const searchQuery = useJournalStore((s) => s.searchQuery);
  const setFilter = useJournalStore((s) => s.setFilter);
  const setMoodFilter = useJournalStore((s) => s.setMoodFilter);
  const setSearchQuery = useJournalStore((s) => s.setSearchQuery);
  const toggleFavorite = useJournalStore((s) => s.toggleFavorite);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  const { isDesktop, isTablet } = useResponsive();

  // Local, immediate value for the input; committed to the store (debounced) so the
  // filtered list doesn't re-run on every keystroke.
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchDraft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchDraft, setSearchQuery]);

  const visibleEntries = useMemo(
    () => getVisibleEntries(allEntries, searchQuery, filter, moodFilter),
    [allEntries, searchQuery, filter, moodFilter],
  );

  const hasActiveFilters = Boolean(searchQuery.trim()) || filter !== 'all' || moodFilter !== null;

  const openNewEntry = () => router.push('/journal/new');
  const openEntry = (id: string) => router.push(`/journal/${id}`);

  const columns = isDesktop ? 3 : isTablet ? 2 : 1;
  const basisClass = columns === 3 ? 'basis-full md:basis-[48%] lg:basis-[31%]' : columns === 2 ? 'basis-full md:basis-[48%]' : 'basis-full';

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8">
        <ResponsiveContainer className="gap-5">
          <View className="flex-row items-center gap-3">
            <BackButton onPress={() => router.push('/')} />
            <Text variant="h2" color="primary" className="flex-1">
              Journal
            </Text>
          </View>

          <SearchBar value={searchDraft} onChangeText={setSearchDraft} />

          <JournalFilters
            filter={filter}
            moodFilter={moodFilter}
            onFilterChange={setFilter}
            onMoodFilterChange={setMoodFilter}
          />

          {visibleEntries.length === 0 ? (
            <EmptyJournal hasActiveFilters={hasActiveFilters} onNewEntry={openNewEntry} />
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {visibleEntries.map((entry) => (
                <View key={entry.id} className={basisClass}>
                  <JournalCard
                    entry={entry}
                    onPress={() => openEntry(entry.id)}
                    onToggleFavorite={() => toggleFavorite(entry.id)}
                    onDelete={() => deleteEntry(entry.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <FAB icon="Plus" onPress={openNewEntry} />
    </SafeAreaView>
  );
}
