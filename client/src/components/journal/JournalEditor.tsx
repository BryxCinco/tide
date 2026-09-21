import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useJournalStore } from '../../store/journalStore';
import { useThemeStore } from '../../store/themeStore';
import type { JournalEntry, Mood } from '../../types/journal';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { countWords, formatMonthDayYear, formatTime, formatWeekday, formatWeekdayMonthDay } from '../../utils/formatDate';
import { shadows } from '../../utils/theme';
import { BackButton, Button, Text } from '../ui';
import { InterestTags } from './InterestTags';
import { MoodSelector } from './MoodSelector';

export interface JournalEditorProps {
  /** Present when editing an existing entry; absent when creating a new one. */
  entry?: JournalEntry;
  /** Called after a save, delete, or header Back completes, so the screen can navigate back. */
  onDone: () => void;
}

const AUTO_SAVE_DELAY = 3000;

/**
 * Shared by app/journal/new.tsx and app/journal/[id].tsx, including its own header
 * (Back / date / Save) — kept in one place rather than duplicated across both screens.
 * A brand-new entry is created on the first auto-save (or the first manual Save) rather
 * than up front, so opening "New Entry" and leaving without typing anything never
 * litters the store with a blank draft.
 */
export function JournalEditor({ entry, onDone }: JournalEditorProps) {
  const addEntry = useJournalStore((s) => s.addEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [savedId, setSavedId] = useState(entry?.id);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isContentFocused, setIsContentFocused] = useState(false);
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const isNew = !entry;
  const createdAt = entry?.createdAt ?? new Date().toISOString();

  const persist = () => {
    const trimmedTitle = title.trim() || 'Untitled';
    if (!title.trim() && !content.trim()) return;

    if (savedId) {
      updateEntry(savedId, { title: trimmedTitle, content, mood, tags });
    } else {
      const created = addEntry({ title: trimmedTitle, content, mood, tags });
      setSavedId(created.id);
    }
  };

  useEffect(() => {
    if (!title.trim() && !content.trim()) return;

    setSaveState('saving');
    const timeout = setTimeout(() => {
      persist();
      setSaveState('saved');
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeout);
    // `persist` closes over title/content/mood/tags and is recreated every render —
    // depending on it directly (instead of these four) would restart the timer on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, mood, tags]);

  const handleSave = () => {
    persist();
    onDone();
  };

  const handleDelete = async () => {
    if (!savedId) {
      onDone();
      return;
    }
    const confirmed = await confirmAsync('Delete entry?', `"${title || 'This entry'}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteEntry(savedId);
    onDone();
  };

  return (
    <View className="flex-1 gap-5">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={onDone} />
        <Text variant="body" color="primary" className="font-semibold normal-case tracking-normal">
          {isNew ? 'Today' : formatWeekdayMonthDay(createdAt)}
        </Text>
        <Button title="Save" variant="primary" size="sm" onPress={handleSave} />
      </View>

      <ScrollView
        className="thin-scrollbar flex-1"
        contentContainerClassName="gap-5 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text variant="h2" color="primary">
              {formatMonthDayYear(createdAt)}
            </Text>
            {saveState !== 'idle' && (
              <Text
                variant="caption"
                color={saveState === 'saving' ? 'muted' : 'accent'}
                className="normal-case tracking-normal"
              >
                {saveState === 'saving' ? 'Saving…' : 'Saved'}
              </Text>
            )}
          </View>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            {formatWeekday(createdAt)} · {formatTime(createdAt)}
          </Text>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Entry title"
          placeholderTextColor={themeColors.text.disabled}
          className="font-sans text-h1 font-bold text-primary"
        />

        <MoodSelector value={mood} onChange={setMood} />

        <InterestTags value={tags} onChange={setTags} />

        <View className="gap-2">
          <Text variant="label" color="muted">
            Entry
          </Text>
          <View
            className={cn('rounded-2xl border bg-elevated p-5', isContentFocused ? 'border-tide-teal' : 'border-default')}
            style={isContentFocused ? (isDark ? shadows.focusRingDark : shadows.focusRing) : undefined}
          >
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write about your day..."
              placeholderTextColor={themeColors.text.disabled}
              multiline
              textAlignVertical="top"
              onFocus={() => setIsContentFocused(true)}
              onBlur={() => setIsContentFocused(false)}
              className="thin-scrollbar min-h-[240px] font-sans text-secondary"
              style={{ fontSize: 16, lineHeight: 27 }}
            />
          </View>
        </View>

        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {countWords(content)} words
        </Text>

        {savedId && <Button title="Delete Entry" variant="danger" size="md" fullWidth onPress={handleDelete} />}
      </ScrollView>
    </View>
  );
}
