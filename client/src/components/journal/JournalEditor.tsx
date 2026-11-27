import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { TextInput } from '../ui/SoundTextInput';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useJournalStore } from '../../store/journalStore';
import { showToast } from '../../store/toastStore';
import type { JournalEntry, Mood } from '../../types/journal';
import { hasMeaningfulContent, parseBlocks, toPlainPreview } from '../../utils/blocks';
import { confirmAsync } from '../../utils/confirm';
import { countWords, formatWeekdayMonthDay } from '../../utils/formatDate';
import { gradientDirections, gradients } from '../../utils/gradients';
import { BackButton, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { BlockEditor, type BlockEditorHandle } from './blocks/BlockEditor';
import { KeyboardBlockToolbar } from './blocks/KeyboardBlockToolbar';
import { PropertiesRow } from './PropertiesRow';

export interface JournalEditorProps {
  /** Present when editing an existing entry; absent when creating a new one. */
  entry?: JournalEntry;
  /** Called after a delete or header Back completes, so the screen can navigate back. */
  onDone: () => void;
}

const AUTO_SAVE_DELAY = 3000;

/**
 * Notion-style entry page, shared by app/journal/new.tsx and app/journal/[id].tsx: cover,
 * big title, a quiet properties list, then the block body. Autosave is the only save — the
 * header always says whether the latest edit is saved, so there is no Save button to forget.
 * A brand-new entry is created on the first autosave rather than up front, so opening
 * "New entry" and leaving without typing never litters the store with a blank draft.
 */
export function JournalEditor({ entry, onDone }: JournalEditorProps) {
  const addEntry = useJournalStore((s) => s.addEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const toggleFavorite = useJournalStore((s) => s.toggleFavorite);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [photoUris, setPhotoUris] = useState<string[]>(entry?.photoUrls ?? []);
  const [savedId, setSavedId] = useState(entry?.id);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const isFavorite = useJournalStore((s) => (savedId ? s.entries.find((e) => e.id === savedId)?.isFavorite : false)) ?? false;

  const themeColors = useThemeColors();
  const { isPhone } = useResponsive();
  const editorRef = useRef<BlockEditorHandle>(null);

  const createdAt = entry?.createdAt ?? new Date().toISOString();
  const isCreatingRef = useRef(false);

  // A photo-only entry (no text typed) is still real content worth saving. Empty blocks
  // (blank lines) are not.
  const hasContent = () => Boolean(title.trim() || photoUris.length > 0 || hasMeaningfulContent(parseBlocks(content)));

  /** Returns whether the entry actually ended up saved. */
  const persist = async (): Promise<boolean> => {
    const trimmedTitle = title.trim() || 'Untitled';
    if (!hasContent()) return false;

    if (savedId) {
      updateEntry(savedId, { title: trimmedTitle, content, mood, tags, photoUrls: photoUris });
      return true;
    }

    // Guards against two autosave ticks (or Back + autosave) racing to create the entry twice.
    if (isCreatingRef.current) return false;
    isCreatingRef.current = true;
    try {
      const created = await addEntry({ title: trimmedTitle, content, mood, tags, photoUrls: photoUris });
      setSavedId(created.id);
      return true;
    } catch {
      // Autosave retries on the next edit; the header shows the failure meanwhile.
      return false;
    } finally {
      isCreatingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasContent()) return;

    setSaveState('saving');
    const timeout = setTimeout(async () => {
      const ok = await persist();
      setSaveState(ok ? 'saved' : 'error');
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeout);
    // `persist` closes over the fields and is recreated every render — depending on it
    // would restart the timer on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, mood, tags, photoUris]);

  // Leaving within the 3s autosave window must not drop the last edits.
  const handleBack = async () => {
    if (saveState === 'saving' || saveState === 'error') {
      const ok = await persist();
      if (!ok && hasContent()) {
        showToast("Couldn't save your entry. Please try again.", 'error');
        return;
      }
    }
    onDone();
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!savedId) {
      onDone();
      return;
    }
    const confirmed = await confirmAsync('Delete entry?', `"${title || 'This entry'}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteEntry(savedId);
    onDone();
  };

  const words = countWords(toPlainPreview(content));
  const cover = photoUris[0];

  return (
    <View className="flex-1 gap-3">
      <View className="flex-row items-center gap-2">
        <BackButton onPress={handleBack} />
        <Text variant="body" color="muted" className="flex-1 text-[13px]" numberOfLines={1}>
          Journal <Text variant="body" color="muted" className="text-[13px]">/</Text>{' '}
          <Text variant="body" color="secondary" className="text-[13px] font-medium">
            {entry ? formatWeekdayMonthDay(createdAt) : 'Today'}
          </Text>
        </Text>
        <SaveStatus state={saveState} />
        <View>
          <Pressable
            onPress={() => setMenuOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="More actions"
            className="h-9 w-9 items-center justify-center rounded-xl hover:bg-[rgba(100,116,139,0.10)]"
          >
            <Icon name="Ellipsis" size={20} color={themeColors.text.secondary} />
          </Pressable>
          {menuOpen && (
            <View
              className="absolute right-0 top-10 z-50 w-[200px] rounded-2xl border border-default bg-elevated py-1.5"
              style={{ shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
            >
              {savedId && (
                <MenuItem
                  icon="Star"
                  label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  onPress={() => {
                    toggleFavorite(savedId);
                    setMenuOpen(false);
                  }}
                />
              )}
              <MenuItem icon="Trash2" label={savedId ? 'Delete entry' : 'Discard'} danger onPress={handleDelete} />
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="thin-scrollbar flex-1" contentContainerClassName="pb-24" keyboardShouldPersistTaps="handled">
          <View className="w-full self-center" style={{ maxWidth: 760 }}>
            {cover ? (
              <Image source={{ uri: cover }} className="w-full rounded-3xl" style={{ height: isPhone ? 120 : 180 }} resizeMode="cover" />
            ) : (
              <LinearGradient colors={gradients.aurora as unknown as [string, string, ...string[]]} {...gradientDirections.horizontal} style={{ height: 3, borderRadius: 3, width: 72 }} />
            )}

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Untitled"
              placeholderTextColor={themeColors.text.disabled}
              multiline
              scrollEnabled={false}
              className="mt-5 p-0 font-sans font-bold text-primary"
              style={{ fontSize: isPhone ? 28 : 34, lineHeight: isPhone ? 36 : 42 }}
            />

            <View className="mt-3">
              <PropertiesRow
                mood={mood}
                onMoodChange={setMood}
                tags={tags}
                onTagsChange={setTags}
                photoUris={photoUris}
                onPhotosChange={setPhotoUris}
                createdAt={createdAt}
              />
            </View>

            <View className="my-4 h-px bg-[rgba(100,116,139,0.18)]" />

            <BlockEditor ref={editorRef} value={content} onChange={setContent} onFocusChange={setEditorFocused} />

            <Text variant="caption" color="muted" className="mt-8 normal-case tracking-normal">
              {words} {words === 1 ? 'word' : 'words'} · {Math.max(1, Math.round(words / 200))} min read
            </Text>
          </View>
        </ScrollView>
        {isPhone && editorFocused && <KeyboardBlockToolbar editor={editorRef} />}
      </KeyboardAvoidingView>
    </View>
  );
}

function SaveStatus({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  const theme = useThemeColors();
  if (state === 'idle') return null;
  const meta = {
    saving: { icon: 'LoaderCircle' as const, label: 'Saving…', color: theme.text.muted },
    saved: { icon: 'CloudCheck' as const, label: 'Saved', color: theme.brand.tideTeal },
    error: { icon: 'CloudAlert' as const, label: 'Not saved', color: theme.status.error },
  }[state];
  return (
    <View className="flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
      <Icon name={meta.icon} size={14} color={meta.color} />
      <Text variant="caption" className="normal-case tracking-normal" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: 'Star' | 'Trash2'; label: string; onPress: () => void; danger?: boolean }) {
  const theme = useThemeColors();
  const color = danger ? theme.status.error : theme.text.secondary;
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" className="mx-1.5 flex-row items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[rgba(100,116,139,0.10)]">
      <Icon name={icon} size={16} color={color} />
      <Text variant="body" className="text-[14px]" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
