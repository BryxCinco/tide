import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../utils/theme';
import { BackButton, Icon, ResponsiveContainer, Text, type IconName } from '../ui';

export interface LegalSection {
  icon: IconName;
  heading: string;
  paragraphs: string[];
}

export interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

/** Shared body for app/legal/privacy.tsx and app/legal/terms.tsx — both are "back button,
 * title, last-updated date, a demo-app notice, then heading+paragraph sections" with
 * nothing else screen-specific, so the two route files only supply content, not markup. */
export function LegalDocument({ title, lastUpdated, sections }: LegalDocumentProps) {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        <ResponsiveContainer className="gap-6 pt-4 md:pt-6 lg:pt-8">
          <View className="flex-row items-center gap-3">
            <BackButton onPress={() => router.back()} />
            <View>
              <Text variant="h2" color="primary">
                {title}
              </Text>
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                Last updated: {lastUpdated}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 rounded-xl border border-accent bg-tide-teal/5 p-4">
            <Icon name="Info" size={18} color={colors.brand.tideTeal} />
            <Text variant="body" color="secondary" className="flex-1 normal-case leading-relaxed tracking-normal">
              This is a demo app. The content below is for illustrative purposes only and is not real legal advice.
            </Text>
          </View>

          <View className="max-w-2xl gap-8">
            {sections.map((section) => (
              <View key={section.heading} className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon name={section.icon} size={18} color={colors.brand.tideTeal} />
                  <Text variant="h3" color="primary">
                    {section.heading}
                  </Text>
                </View>
                <View className="gap-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <Text key={index} variant="body" color="secondary" className="normal-case leading-relaxed tracking-normal">
                      {paragraph}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
