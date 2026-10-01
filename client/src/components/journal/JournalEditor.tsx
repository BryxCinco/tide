import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TextInput } from '../ui/SoundTextInput';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useJournalStore } from '../../store/journalStore';
import { useThemeStore } from '../../store/themeStore';
import type { JournalEntry, Mood } from '../../types/journal';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { countWords, formatMonthDayYear, formatTime, formatWeekday, formatWeekdayMonthDay } from '../../utils/formatDate';
import { shadows } from '../../utils/theme';
import { BackButton, Button, ConfirmationModal, Text } from '../ui';
import { InterestTags } from './InterestTags';
import { JournalPhotoPicker } from './JournalPhotoPicker';
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
  const [photoUris, setPhotoUris] = useState<string[]>(entry?.photoUrls ?? []);
  const [savedId, setSavedId] = useState(entry?.id);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isContentFocused, setIsContentFocused] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const isNew = !entry;
  const createdAt = entry?.createdAt ?? new Date().toISOString();

  const isCreatingRef = useRef(false);

  // A photo-only entry (no text typed) is still real content worth saving — same bar as
  // title/content, just extended now that photos are a legitimate way to start an entry.
  const hasContent = () => Boolean(title.trim() || content.trim() || photoUris.length > 0);

  const persist = async () => {
    const trimmedTitle = title.trim() || 'Untitled';
    if (!hasContent()) return;

    if (savedId) {
      updateEntry(savedId, { title: trimmedTitle, content, mood, tags, photoUrls: photoUris });
      return;
    }

    // Guards against the autosave timer and a manual Save firing the very first create
    // twice (e.g. Save tapped right as the 3s autosave timer also elapses) — both would
    // otherwise see savedId still unset and race to POST two separate entries.
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    try {
      const created = await addEntry({ title: trimmedTitle, content, mood, tags, photoUrls: photoUris });
      setSavedId(created.id);
    } catch {
      // Failure is silent here (autosave retries on the next tick); a manual Save's
      // failure is surfaced via handleSave below instead.
    } finally {
      isCreatingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasContent()) return;

    setSaveState('saving');
    const timeout = setTimeout(async () => {
      await persist();
      setSaveState('saved');
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeout);
    // `persist` closes over title/content/mood/tags/photoUris and is recreated every render —
    // depending on it directly (instead of these five) would restart the timer on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, mood, tags, photoUris]);

  // Unlike autosave (which fires silently every 3s while typing — a modal there would be
  // constant and unusable), an explicit Save tap is a deliberate action worth confirming.
  const handleSave = async () => {
    await persist();
    setShowSavedModal(true);
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
        <Text
          variant="body"
          color="primary"
          className="flex-1 px-2 text-center font-semibold normal-case tracking-normal"
          numberOfLines={1}
        >
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

        <JournalPhotoPicker photoUris={photoUris} onChange={setPhotoUris} />

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

      <ConfirmationModal
        visible={showSavedModal}
        onClose={onDone}
        variant="success"
        icon="BookOpen"
        title="Entry Saved!"
        message="Your thoughts have been recorded."
        autoDismissMs={3000}
        primaryAction={{ label: 'View Entry', onPress: () => setShowSavedModal(false) }}
        secondaryAction={{ label: 'Write Another', onPress: () => router.replace('/journal/new') }}
        tertiaryAction={{ label: 'Done', onPress: onDone }}
      />
    </View>
  );
}
