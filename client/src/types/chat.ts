export type ChatRole = 'user' | 'assistant';

/** A "go look at it" chip the AI Coach can attach to a reply when it actually did
 * something (added a task, logged a mood, started a timer, ...) — a short summary of what
 * happened plus a button straight to the screen where it shows up, instead of leaving the
 * user to go find it themselves. Built server-side (see server/routes/chat.js's
 * TOOL_ACTIONS) from the same tool call that produced the reply. */
export interface ChatAction {
  label: string;
  /** expo-router path, e.g. "/tasks" or "/(tabs)/insights". */
  route: string;
  /** Lucide icon name. */
  icon?: string;
  /** One-line summary of what happened — the tool handler's own result message. */
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

export interface QuickSuggestion {
  id: string;
  label: string;
  /** Lucide icon name (see components/ui/Icon.tsx's `IconName`) — kept as a plain string
   * here rather than importing that type, so this data-only file doesn't reach into `ui/`. */
  icon?: string;
}
