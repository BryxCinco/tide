import type { JournalEntry, Mood } from '../types/journal';
import type { XpResult } from '../types/xp';
import { api } from './api';

export interface ApiJournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
  photo_urls: string[] | null;
}

export interface CreateJournalPayload {
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
  /** A mix of existing https:// URLs and new data: URIs from pickImage() — the server
   * uploads whichever are data: URIs and passes the rest through unchanged. */
  photoUrls?: string[];
}

export interface UpdateJournalPayload {
  title?: string;
  content?: string;
  mood?: Mood | null;
  tags?: string[];
  isFavorite?: boolean;
  photoUrls?: string[];
}

function mapApiJournalEntry(row: ApiJournalEntry): JournalEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    mood: (row.mood as Mood | null) ?? null,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wordCount: row.word_count,
    photoUrls: row.photo_urls ?? [],
  };
}

export const journalService = {
  async list(): Promise<JournalEntry[]> {
    const { data } = await api.get<{ entries: ApiJournalEntry[] }>('/api/journal-entries');
    return data.entries.map(mapApiJournalEntry);
  },

  async create(payload: CreateJournalPayload): Promise<{ entry: JournalEntry; xp: XpResult | null }> {
    const { data } = await api.post<{ entry: ApiJournalEntry; xp: XpResult | null }>('/api/journal-entries', {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      tags: payload.tags,
      photo_urls: payload.photoUrls,
    });
    return { entry: mapApiJournalEntry(data.entry), xp: data.xp };
  },

  async update(id: string, payload: UpdateJournalPayload): Promise<JournalEntry> {
    const { data } = await api.patch<{ entry: ApiJournalEntry }>(`/api/journal-entries/${id}`, {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      tags: payload.tags,
      is_favorite: payload.isFavorite,
      photo_urls: payload.photoUrls,
    });
    return mapApiJournalEntry(data.entry);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/journal-entries/${id}`);
  },
};
