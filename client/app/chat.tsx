import { router } from 'expo-router';
import { useEffect } from 'react';

import { useUiStore } from '@/store/uiStore';

/**
 * Thin redirector, not a screen of its own. `/chat` exists purely so NavItem.tsx
 * ("AI Coach" in the sidebar/drawer) and the dashboard's "Chat with Coach" quick action
 * can keep using plain `href`-based navigation like every other nav entry, without
 * NavItem/QuickActions needing special-case "this one triggers a store action instead of
 * navigating" logic (the app deliberately moved away from that pattern already — see
 * QuickActions.tsx's history with the old '#chat' href hack).
 *
 * Visiting this route just opens ChatPanel.tsx (mounted globally in app/_layout.tsx,
 * driven by uiStore's isChatOpen) and immediately goes back — so the panel appears over
 * whatever screen you were already on, exactly like the FAB, instead of navigating you
 * away from it. This used to be a full second chat UI with its own header/bubble/input
 * chrome; that was the actual bug behind "the redesign didn't apply" — any entry point
 * that landed here bypassed ChatPanel entirely and showed the old, unstyled screen.
 */
export default function ChatRedirect() {
  const openChat = useUiStore((s) => s.openChat);

  useEffect(() => {
    openChat();
    router.back();
  }, [openChat]);

  return null;
}
