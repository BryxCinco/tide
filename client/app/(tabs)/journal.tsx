import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyJournal, JournalCard, JournalFilters, JournalPromptTile, JournalStatsTile, SearchBar } from '@/components/journal';
import { BentoTile, Button, ErrorState, FAB, ResponsiveContainer, SkeletonCard, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
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

  const { isDesktop, isTablet, isPhone } = useResponsive();
  const { user } = useAuth();

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

  // Bento rhythm for the entry grid: every 5th entry (starting with the newest) is a large
  // "featured" tile two columns wide, the rest are regular tiles. flexGrow lets each row
  // fill exactly, so rows never end ragged on wide screens.
  const tileStyle = (index: number) => {
    const featured = columns > 1 && index % 5 === 0;
    if (columns === 1) return { featured: false, style: { flexBasis: '100%' as const } };
    if (columns === 2) return { featured, style: { flexBasis: featured ? ('100%' as const) : ('45%' as const), flexGrow: 1 } };
    return { featured, style: { flexBasis: featured ? ('60%' as const) : ('30%' as const), flexGrow: 1 } };
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24 pt-3 md:pt-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ResponsiveContainer className="gap-2.5 md:gap-3">
          <View className="flex-row items-center justify-between pl-12 md:pl-0">
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text variant="label" color="muted" className="text-[10.5px]" style={{ letterSpacing: 1.2 }}>
                Journal
              </Text>
              <Text variant="h2" color="primary" className={isPhone ? 'text-[19px] leading-[24px]' : 'text-[22px] leading-[28px]'} numberOfLines={2}>
                Your story, day by day
              </Text>
            </View>
            {!isPhone && <Button title="New entry" icon="Plus" size="sm" onPress={openNewEntry} />}
          </View>

          <View className="gap-2.5 md:flex-row md:gap-3">
            <JournalPromptTile
              className="md:flex-[1.6]"
              firstName={user?.name?.trim().split(/\s+/)[0]}
              onWrite={openNewEntry}
            />
            <JournalStatsTile
              className="md:flex-1"
              entries={allEntries}
              onMoodPress={(mood) => setMoodFilter(moodFilter === mood ? null : mood)}
            />
          </View>

          <BentoTile tone="glass" dense index={2}>
            <View className="gap-3">
              <SearchBar value={searchDraft} onChangeText={setSearchDraft} />
              <JournalFilters
                filter={filter}
                moodFilter={moodFilter}
                onFilterChange={setFilter}
                onMoodFilterChange={setMoodFilter}
              />
            </View>
          </BentoTile>

          {error && allEntries.length === 0 ? (
            <ErrorState
              message={error}
              onRetry={() => {
                clearError();
                fetchEntries();
              }}
            />
          ) : isLoading && allEntries.length === 0 ? (
            <View className="flex-row flex-wrap gap-2.5">
              {[0, 1, 2].map((i) => (
                <View key={i} className={basisClass}>
                  <SkeletonCard />
                </View>
              ))}
            </View>
          ) : visibleEntries.length === 0 ? (
            <EmptyJournal hasActiveFilters={hasActiveFilters} onNewEntry={openNewEntry} />
          ) : (
            <View className="flex-row flex-wrap gap-2.5 md:gap-3">
              {visibleEntries.map((entry, index) => {
                const tile = tileStyle(index);
                return (
                  <View key={entry.id} style={tile.style}>
                    <JournalCard
                      entry={entry}
                      index={index}
                      featured={tile.featured}
                      onPress={() => openEntry(entry.id)}
                      onToggleFavorite={() => toggleFavorite(entry.id)}
                      onDelete={() => deleteEntry(entry.id)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {isPhone && <FAB icon="Plus" onPress={openNewEntry} accessibilityLabel="New journal entry" />}
    </SafeAreaView>
  );
}
