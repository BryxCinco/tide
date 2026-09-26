import type { JournalEntry, Mood } from '../types/journal';
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
}

export interface CreateJournalPayload {
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
}

export interface UpdateJournalPayload {
  title?: string;
  content?: string;
  mood?: Mood | null;
  tags?: string[];
  isFavorite?: boolean;
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
  };
}

export const journalService = {
  async list(): Promise<JournalEntry[]> {
    const { data } = await api.get<{ entries: ApiJournalEntry[] }>('/api/journal-entries');
    return data.entries.map(mapApiJournalEntry);
  },

  async create(payload: CreateJournalPayload): Promise<JournalEntry> {
    const { data } = await api.post<{ entry: ApiJournalEntry }>('/api/journal-entries', {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      tags: payload.tags,
    });
    return mapApiJournalEntry(data.entry);
  },

  async update(id: string, payload: UpdateJournalPayload): Promise<JournalEntry> {
    const { data } = await api.patch<{ entry: ApiJournalEntry }>(`/api/journal-entries/${id}`, {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      tags: payload.tags,
      is_favorite: payload.isFavorite,
    });
    return mapApiJournalEntry(data.entry);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/journal-entries/${id}`);
  },
};
