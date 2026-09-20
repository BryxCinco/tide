import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  Input,
  Loader,
  ProgressBar,
  Text,
  type TextVariant,
} from '@/components/ui';
import { colors, radius, spacing } from '@/utils/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-8">
      <Text variant="h2" color="primary" className="mb-4">
        {title}
      </Text>
      {children}
    </View>
  );
}

function SubBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text variant="caption" color="muted" className="mb-3">
        {title}
      </Text>
      {children}
    </View>
  );
}

function PageDivider({ label }: { label: string }) {
  return (
    <View className="mb-8 mt-2">
      <Text variant="label" color="accent" className="mb-2">
        {label}
      </Text>
      <Divider spacing="sm" />
    </View>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={{ width: 92 }}>
      <View className="h-14 w-14 rounded-lg border border-default" style={{ backgroundColor: hex }} />
      <Text variant="caption" color="secondary" className="mt-2 normal-case tracking-normal">
        {name}
      </Text>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {hex}
      </Text>
    </View>
  );
}

const colorGroups: { title: string; swatches: { name: string; hex: string }[] }[] = [
  {
    title: 'Background',
    swatches: [
      { name: 'base', hex: colors.background.base },
      { name: 'elevated', hex: colors.background.elevated },
      { name: 'surface', hex: colors.background.surface },
      { name: 'hover', hex: colors.background.hover },
    ],
  },
  {
    title: 'Brand',
    swatches: [
      { name: 'tide-teal', hex: colors.brand.tideTeal },
      { name: 'tide-teal-dark', hex: colors.brand.tideTealDark },
      { name: 'tide-teal-light', hex: colors.brand.tideTealLight },
      { name: 'ocean-blue', hex: colors.brand.oceanBlue },
      { name: 'deep-purple (use sparingly)', hex: colors.brand.deepPurple },
    ],
  },
  {
    title: 'Text',
    swatches: [
      { name: 'primary', hex: colors.text.primary },
      { name: 'secondary', hex: colors.text.secondary },
      { name: 'muted', hex: colors.text.muted },
      { name: 'disabled', hex: colors.text.disabled },
      { name: 'inverse', hex: colors.text.inverse },
    ],
  },
  {
    title: 'Border',
    swatches: [
      { name: 'subtle', hex: colors.border.subtle },
      { name: 'default', hex: colors.border.default },
      { name: 'hover', hex: colors.border.hover },
      { name: 'accent', hex: colors.border.accent },
    ],
  },
  {
    title: 'Status',
    swatches: [
      { name: 'success', hex: colors.status.success },
      { name: 'warning', hex: colors.status.warning },
      { name: 'error', hex: colors.status.error },
      { name: 'info', hex: colors.status.info },
    ],
  },
];

const typographyTokens: { variant: TextVariant; px: number; sample: string }[] = [
  { variant: 'display', px: 36, sample: 'Build your best day' },
  { variant: 'h1', px: 30, sample: 'Today’s focus' },
  { variant: 'h2', px: 24, sample: 'Time tracked' },
  { variant: 'h3', px: 20, sample: 'Deep work session' },
  { variant: 'body-lg', px: 17, sample: 'You logged 4h 12m of focused work today.' },
  { variant: 'body', px: 15, sample: 'Journal entries help you reflect on your progress.' },
  { variant: 'caption', px: 13, sample: 'Last synced 2 minutes ago' },
  { variant: 'label', px: 11, sample: 'Status' },
];

const spacingTokens = Object.entries(spacing) as [string, number][];
const radiusTokens = Object.entries(radius) as [string, number][];

/**
 * Tide Light design system reference: Foundations (design tokens) + a live
 * gallery of every src/components/ui component. Temporary — not part of the
 * app's real navigation flow.
 */
export default function TestScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-16">
        <Text variant="display" color="primary" className="mb-1">
          Tide Light
        </Text>
        <Text variant="body" color="muted" className="mb-8">
          Design system &amp; component gallery
        </Text>

        <PageDivider label="Foundations" />

        <Section title="Design tokens">
          <View className="gap-8">
            <SubBlock title="Colors">
              <View className="gap-6">
                {colorGroups.map((group) => (
                  <View key={group.title}>
                    <Text variant="label" color="muted" className="mb-3">
                      {group.title}
                    </Text>
                    <View className="flex-row flex-wrap gap-4">
                      {group.swatches.map((swatch) => (
                        <Swatch key={swatch.name} name={swatch.name} hex={swatch.hex} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </SubBlock>

            <SubBlock title="Typography">
              <View className="gap-3">
                {typographyTokens.map(({ variant, px, sample }) => (
                  <View
                    key={variant}
                    className="flex-row items-baseline justify-between gap-3 border-b border-subtle pb-3"
                  >
                    <Text variant={variant} color="primary" className="flex-1">
                      {sample}
                    </Text>
                    <Text variant="caption" color="muted" className="normal-case tracking-normal">
                      {variant} {'·'} {px}px
                    </Text>
                  </View>
                ))}
              </View>
            </SubBlock>

            <SubBlock title="Spacing scale">
              <View className="gap-2.5">
                {spacingTokens.map(([name, value]) => (
                  <View key={name} className="flex-row items-center gap-3">
                    <Text variant="caption" color="secondary" className="w-10 normal-case tracking-normal">
                      {name}
                    </Text>
                    <View className="h-4 rounded bg-tide-teal" style={{ width: value }} />
                    <Text variant="caption" color="muted" className="normal-case tracking-normal">
                      {value}px
                    </Text>
                  </View>
                ))}
              </View>
            </SubBlock>

            <SubBlock title="Radius scale">
              <View className="flex-row flex-wrap gap-4">
                {radiusTokens.map(([name, value]) => (
                  <View key={name} style={{ width: 84 }}>
                    <View
                      className="h-14 w-14 border border-default bg-surface"
                      style={{ borderRadius: value }}
                    />
                    <Text variant="caption" color="secondary" className="mt-2 normal-case tracking-normal">
                      {name}
                    </Text>
                    <Text variant="caption" color="muted" className="normal-case tracking-normal">
                      {value}px
                    </Text>
                  </View>
                ))}
              </View>
            </SubBlock>
          </View>
        </Section>

        <PageDivider label="Components" />

        <Section title="Buttons">
          <View className="gap-6">
            <SubBlock title="Variants">
              <View className="flex-row flex-wrap gap-3">
                <Button title="Primary" onPress={() => {}} />
                <Button title="Secondary" variant="secondary" onPress={() => {}} />
                <Button title="Ghost" variant="ghost" onPress={() => {}} />
                <Button title="Danger" variant="danger" onPress={() => {}} />
              </View>
            </SubBlock>

            <SubBlock title="Sizes">
              <View className="flex-row flex-wrap items-center gap-3">
                <Button title="Small" size="sm" onPress={() => {}} />
                <Button title="Medium" size="md" onPress={() => {}} />
                <Button title="Large" size="lg" onPress={() => {}} />
              </View>
            </SubBlock>

            <SubBlock title="States">
              <View className="flex-row flex-wrap gap-3">
                <Button title="Disabled" disabled onPress={() => {}} />
                <Button title="Loading" loading onPress={() => {}} />
                <Button title="With icon" icon="Plus" onPress={() => {}} />
                <Button
                  title="Icon right"
                  icon="ArrowRight"
                  iconPosition="right"
                  variant="secondary"
                  onPress={() => {}}
                />
              </View>
            </SubBlock>

            <SubBlock title="Full width">
              <Button title="Start timer" icon="Play" size="lg" fullWidth onPress={() => {}} />
            </SubBlock>
          </View>
        </Section>

        <Section title="Input">
          <View className="gap-4">
            <Input placeholder="No label, just a placeholder" />
            <Input label="Email" placeholder="you@example.com" />
            <Input label="Email" placeholder="you@example.com" error="Please enter a valid email address" />
            <Input label="Search" placeholder="Search entries" icon="Search" />
            <Input label="Password" placeholder="Enter your password" secureTextEntry />
            <Input label="Notes" placeholder="Write about your day..." multiline />
          </View>
        </Section>

        <Section title="Cards">
          <View className="flex-row flex-wrap gap-3">
            <Card variant="default" className="grow basis-[260px]">
              <Text variant="h3" color="primary" className="mb-1">
                Default
              </Text>
              <Text variant="body" color="muted">
                Standard surface for most content.
              </Text>
            </Card>
            <Card variant="elevated" className="grow basis-[260px]">
              <Text variant="h3" color="primary" className="mb-1">
                Elevated
              </Text>
              <Text variant="body" color="muted">
                Lifted surface with a soft shadow.
              </Text>
            </Card>
            <Card variant="glass" className="grow basis-[260px]">
              <Text variant="h3" color="primary" className="mb-1">
                Glass
              </Text>
              <Text variant="body" color="muted">
                Glassmorphism tint for overlays.
              </Text>
            </Card>
            <Card variant="gradient" accentLine className="grow basis-[260px]">
              <Text variant="h3" color="inverse" className="mb-1">
                Gradient
              </Text>
              <Text variant="body" color="inverse" className="opacity-90">
                Hero-style background with an accent line.
              </Text>
            </Card>
            <Card variant="outlined" className="grow basis-[260px]">
              <Text variant="h3" color="primary" className="mb-1">
                Outlined
              </Text>
              <Text variant="body" color="muted">
                Transparent surface, border only.
              </Text>
            </Card>
          </View>
        </Section>

        <Section title="Badges">
          <View className="gap-3">
            <SubBlock title="Tints, with status dot">
              <View className="flex-row flex-wrap items-center gap-2">
                <Badge label="Default" variant="default" dot />
                <Badge label="Teal" variant="teal" dot />
                <Badge label="Blue" variant="blue" dot />
                <Badge label="Critical" variant="purple" dot />
                <Badge label="Success" variant="success" dot />
                <Badge label="Warning" variant="warning" dot />
                <Badge label="Error" variant="error" dot />
              </View>
            </SubBlock>
            <SubBlock title="Small, no dot">
              <View className="flex-row flex-wrap items-center gap-2">
                <Badge label="Default" variant="default" size="sm" />
                <Badge label="Teal" variant="teal" size="sm" />
                <Badge label="Blue" variant="blue" size="sm" />
                <Badge label="Important" variant="purple" size="sm" />
                <Badge label="Success" variant="success" size="sm" />
                <Badge label="Warning" variant="warning" size="sm" />
                <Badge label="Error" variant="error" size="sm" />
              </View>
            </SubBlock>
          </View>
        </Section>

        <Section title="Avatars">
          <View className="gap-4">
            <View className="flex-row flex-wrap items-center gap-3">
              <Avatar name="Ada Lovelace" size="sm" />
              <Avatar name="Grace Hopper" size="md" />
              <Avatar name="Alan Turing" size="lg" />
              <Avatar name="Margaret Hamilton" size="xl" />
            </View>
            <View className="flex-row flex-wrap items-center gap-3">
              <Avatar source="https://i.pravatar.cc/150?img=12" size="lg" />
              <Avatar name="Katherine Johnson" size="lg" status="online" />
              <Avatar name="Radia Perlman" size="lg" status="busy" />
              <Avatar name="Hedy Lamarr" size="lg" status="offline" />
              <Avatar name="Barbara Liskov" size="lg" ring />
            </View>
          </View>
        </Section>

        <Section title="Progress bars">
          <View className="gap-4">
            <ProgressBar value={25} variant="teal" showLabel />
            <ProgressBar value={50} variant="blue" showLabel />
            <ProgressBar value={75} variant="purple" showLabel />
            <ProgressBar value={100} variant="gradient" showLabel />
          </View>
        </Section>

        <Section title="Divider">
          <View className="gap-4">
            <Divider />
            <Divider label="OR" />
            <View className="h-16 flex-row items-center">
              <Text variant="body" color="muted">
                Left
              </Text>
              <Divider orientation="vertical" />
              <Text variant="body" color="muted">
                Right
              </Text>
            </View>
          </View>
        </Section>

        <Section title="Loader">
          <View className="flex-row items-center gap-8">
            <View className="items-center gap-2">
              <Loader size="sm" />
              <Text variant="caption" color="muted">
                sm
              </Text>
            </View>
            <View className="items-center gap-2">
              <Loader size="md" />
              <Text variant="caption" color="muted">
                md
              </Text>
            </View>
            <View className="items-center gap-2">
              <Loader size="lg" />
              <Text variant="caption" color="muted">
                lg
              </Text>
            </View>
          </View>
        </Section>

        <Section title="Empty state">
          <View className="h-72 overflow-hidden rounded-2xl border border-subtle bg-surface">
            <EmptyState
              icon="Inbox"
              title="No entries yet"
              description="Start a timer or write a journal entry to see it show up here."
              actionLabel="Create entry"
              onAction={() => {}}
            />
          </View>
        </Section>

        <View className="flex-row items-center gap-2 opacity-50">
          <Icon name="Check" size={14} color={colors.text.muted} />
          <Text variant="caption" color="muted">
            End of component gallery
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
