import { View } from 'react-native';

import { getQuoteOfTheDay } from '../../mocks/mockQuotes';
import { ocean } from '../../utils/theme';
import { BentoTile, Icon, Text } from '../ui';

/** One-line-ish quote strip — same quote all day (see getQuoteOfTheDay), not random per render. */
export function QuoteCard() {
  const quote = getQuoteOfTheDay();

  return (
    <BentoTile tone="glass" dense>
      <View className="flex-row items-start gap-2.5">
        <View className="h-6 w-6 items-center justify-center rounded-[8px] bg-tide-teal/10">
          <Icon name="Quote" size={12} color={ocean.lagoon} strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="body" color="primary" className="text-[13.5px] italic leading-[19px]">
            {quote.text}
          </Text>
          <Text variant="body" color="muted" className="text-[11.5px]">
            — {quote.author}
          </Text>
        </View>
      </View>
    </BentoTile>
  );
}
