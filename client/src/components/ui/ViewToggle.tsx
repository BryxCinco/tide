import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { gradientDirections, gradients } from '../../utils/gradients';
import { Icon, type IconName } from './Icon';
import { Pressable } from './SoundPressable';
import { Text } from './Text';

export interface ViewToggleProps<V extends string> {
  value: V;
  options: { value: V; label: string; icon: IconName }[];
  onChange: (value: V) => void;
}

/** Notion-style view tabs (Gallery / List, Board / Table): the active one gets an aurora underline. */
export function ViewToggle<V extends string>({ value, options, onChange }: ViewToggleProps<V>) {
  const theme = useThemeColors();
  return (
    <View className="flex-row items-center gap-1" accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        const color = active ? theme.text.primary : theme.text.muted;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="rounded-lg px-2.5 pb-1.5 pt-1.5 hover:bg-[rgba(100,116,139,0.08)]"
          >
            <View className="flex-row items-center gap-1.5">
              <Icon name={opt.icon} size={15} color={color} />
              <Text variant="body" className="text-[13.5px] font-medium" style={{ color }}>
                {opt.label}
              </Text>
            </View>
            <LinearGradient
              colors={gradients.aurora as unknown as [string, string, ...string[]]}
              {...gradientDirections.horizontal}
              style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, borderRadius: 2, opacity: active ? 1 : 0 }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
