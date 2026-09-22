export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface QuickSuggestion {
  id: string;
  label: string;
  /** Lucide icon name (see components/ui/Icon.tsx's `IconName`) — kept as a plain string
   * here rather than importing that type, so this data-only file doesn't reach into `ui/`. */
  icon?: string;
}
