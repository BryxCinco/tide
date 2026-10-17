import { View } from 'react-native';

import { getQuoteOfTheDay } from '../../mocks/mockQuotes';
import { colors } from '../../utils/theme';
import { Card, Icon, Text } from '../ui';

/** Minimal, teal-accented card — same quote all day (see getQuoteOfTheDay), not random per render. */
export function QuoteCard() {
  const quote = getQuoteOfTheDay();

  return (
    <Card variant="default" padding="lg" className="gap-3 rounded-[24px]">
      <Icon name="Quote" size={20} color={colors.brand.tideTeal} />
      <Text variant="body-lg" color="primary" className="italic">
        {quote.text}
      </Text>
      <View className="flex-row items-center gap-2">
        <View className="h-px w-4" style={{ backgroundColor: colors.brand.tideTeal }} />
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {quote.author}
        </Text>
      </View>
    </Card>
  );
}
