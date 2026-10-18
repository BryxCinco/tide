import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { chatService, type InsightSuggestion, type InsightSuggestionType } from '../../services/chat.service';
import { colors } from '../../utils/theme';
import { Icon, SkeletonRow, Text, type IconName } from '../ui';

const TYPE_META: Record<InsightSuggestionType, { icon: IconName; color: string }> = {
  priority: { icon: 'Flag', color: colors.status.warning },
  balance: { icon: 'Scale', color: colors.brand.oceanBlue },
  improvement: { icon: 'TrendingUp', color: colors.brand.deepPurple },
  celebration: { icon: 'PartyPopper', color: colors.brand.tideTeal },
};

/**
 * Self-fetching card for Insights' "AI Suggestions" section — calls POST /api/chat/insights
 * on mount (no props; the server builds everything from the user's own real stats, see that
 * route's comment) and renders 3-5 suggestion rows, each tinted by its type (priority/
 * balance/improvement/celebration).
 */
// Suggestions are an AI call that shares the coach's tokens-per-minute budget, and the
// underlying weekly stats barely move between visits — reuse a result for a while instead of
// spending a model call every time Insights is opened.
const CACHE_MS = 15 * 60 * 1000;
// Keyed by user so a different account signing in on the same device never sees these.
let cached: { userId: string; at: number; suggestions: InsightSuggestion[] } | null = null;

export function AiSuggestions() {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const fresh = cached && cached.userId === userId && Date.now() - cached.at < CACHE_MS ? cached.suggestions : null;
  const [suggestions, setSuggestions] = useState<InsightSuggestion[]>(fresh ?? []);
  const [isLoading, setIsLoading] = useState(!fresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    chatService
      .getInsightSuggestions()
      .then((result) => {
        cached = { userId, at: Date.now(), suggestions: result };
        if (!cancelled) setSuggestions(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Mount-only: a cached result for this user is used as-is until it ages out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View className="gap-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </View>
    );
  }

  if (error) {
    return (
      <Text variant="body" color="muted" className="normal-case tracking-normal">
        Couldn't load suggestions: {error}
      </Text>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Text variant="body" color="muted" className="normal-case tracking-normal">
        Not enough data yet — track a few more sessions and tasks and check back.
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {suggestions.map((suggestion, index) => {
        const meta = TYPE_META[suggestion.type] ?? TYPE_META.improvement;
        return (
          <View key={index} className="flex-row items-start gap-3 rounded-2xl border border-subtle bg-base p-3.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}1F` }}>
              <Icon name={meta.icon} size={16} color={meta.color} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="body" color="primary" className="text-[14px] font-semibold">
                {suggestion.title}
              </Text>
              <Text variant="body" color="muted" className="text-[12px] leading-[17px]">
                {suggestion.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
