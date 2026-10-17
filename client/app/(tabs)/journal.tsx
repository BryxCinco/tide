import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyJournal, JournalCard, JournalFilters, SearchBar } from '@/components/journal';
import { BackButton, ErrorState, FAB, ResponsiveContainer, SkeletonCard, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { getVisibleEntries, useJournalStore } from '@/store/journalStore';

const SEARCH_DEBOUNCE_MS = 300;

export default function JournalScreen() {
  const allEntries = useJournalStore((s) => s.entries);
  const filter = useJournalStore((s) => s.filter);
  const moodFilter = useJournalStore((s) => s.moodFilter);
  const searchQuery = useJournalStore((s) => s.searchQuery);
  const isLoading = useJournalStore((s) => s.isLoading);
  const error = useJournalStore((s) => s.error);
  const fetchEntries = useJournalStore((s) => s.fetchEntries);
  const clearError = useJournalStore((s) => s.clearError);
  const setFilter = useJournalStore((s) => s.setFilter);
  const setMoodFilter = useJournalStore((s) => s.setMoodFilter);
  const setSearchQuery = useJournalStore((s) => s.setSearchQuery);
  const toggleFavorite = useJournalStore((s) => s.toggleFavorite);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  const { isDesktop, isTablet } = useResponsive();

  // Local, immediate value for the input; committed to the store (debounced) so the
  // filtered list doesn't re-run on every keystroke.
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

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
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ResponsiveContainer className="gap-5">
          <Animated.View entering={FadeInDown.duration(380)} className="flex-row items-center gap-3">
            <BackButton onPress={() => router.push('/')} />
            <View className="flex-1">
              <Text variant="h2" color="primary">
                Journal
              </Text>
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(380)} className="gap-5">
            <SearchBar value={searchDraft} onChangeText={setSearchDraft} />

            <JournalFilters
              filter={filter}
              moodFilter={moodFilter}
              onFilterChange={setFilter}
              onMoodFilterChange={setMoodFilter}
            />
          </Animated.View>

          {error && allEntries.length === 0 ? (
            <ErrorState
              message={error}
              onRetry={() => {
                clearError();
                fetchEntries();
              }}
            />
          ) : isLoading && allEntries.length === 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {[0, 1, 2].map((i) => (
                <View key={i} className={basisClass}>
                  <SkeletonCard />
                </View>
              ))}
            </View>
          ) : visibleEntries.length === 0 ? (
            <EmptyJournal hasActiveFilters={hasActiveFilters} onNewEntry={openNewEntry} />
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {visibleEntries.map((entry, index) => (
                <View key={entry.id} className={basisClass}>
                  <JournalCard
                    entry={entry}
                    index={index}
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
