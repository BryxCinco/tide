import type { User } from '../types/user';
import { type ApiProfile, mapProfileToUser } from './auth.service';
import { api } from './api';

export interface UpdateProfilePayload {
  name?: string;
  /** `null` clears the field server-side; `undefined`/omitted leaves it untouched. Plain
   * optional fields can't tell "don't change this" from "clear this" apart (JSON.stringify
   * drops `undefined` keys, which is exactly what "don't change" needs — but Remove
   * Avatar/Remove Cover need the key to actually reach the server as `null`, not vanish). */
  bio?: string | null;
  avatar?: string | null;
  coverType?: string | null;
  coverValue?: string | null;
}

export const profileService = {
  async update(payload: UpdateProfilePayload): Promise<User> {
    const body: Record<string, unknown> = {};
    if ('name' in payload) body.name = payload.name;
    if ('bio' in payload) body.bio = payload.bio;
    if ('avatar' in payload) body.avatar_url = payload.avatar;
    if ('coverType' in payload) body.cover_type = payload.coverType;
    if ('coverValue' in payload) body.cover_value = payload.coverValue;

    const { data } = await api.patch<{ profile: ApiProfile }>('/api/profile', body);
    return mapProfileToUser(data.profile);
  },

  /** Thin, purpose-named wrapper over update() — avatar changes are their own flow
   * (AvatarPickerModal) distinct enough from the general profile form to read better named
   * explicitly, even though it's the same PATCH under the hood. */
  async updateAvatar(avatarUrl: string | null): Promise<User> {
    return profileService.update({ avatar: avatarUrl });
  },

  async updateCover(coverType: string | null, coverValue: string | null): Promise<User> {
    return profileService.update({ coverType, coverValue });
  },
};
