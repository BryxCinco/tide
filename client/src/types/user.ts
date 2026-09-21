export type CoverType = 'gradient' | 'image' | 'solid';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  /** Short bio shown under the name on the Dashboard's Notion-style profile header. */
  bio?: string;
  /** Defaults to the first preset gradient (see COVER_GRADIENTS) when unset. */
  coverType?: CoverType;
  /** Gradient preset id, image URI, or hex color, depending on `coverType`. */
  coverValue?: string;
  createdAt: string;
  isGuest: boolean;
}
