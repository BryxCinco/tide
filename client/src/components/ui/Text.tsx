import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '../../utils/cn';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-lg'
  | 'body'
  | 'caption'
  | 'label';

export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse';

export interface TextProps extends RNTextProps {
  /** Typography scale to apply. Defaults to `body`. */
  variant?: TextVariant;
  /** Semantic text color. Defaults to `secondary`. */
  color?: TextColor;
  /** Additional NativeWind classes, merged after the variant/color classes. */
  className?: string;
}

const variantClasses: Record<TextVariant, string> = {
  display: 'text-display font-bold tracking-tight',
  h1: 'text-h1 font-bold tracking-tight',
  h2: 'text-h2 font-semibold tracking-tight',
  h3: 'text-h3 font-semibold tracking-tight',
  'body-lg': 'text-body-lg font-sans',
  body: 'text-body font-sans',
  caption: 'text-caption font-medium uppercase tracking-wide',
  label: 'text-label font-medium uppercase tracking-wide',
};

const colorClasses: Record<TextColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted',
  accent: 'text-tide-teal',
  /** For text placed on solid teal/dark backgrounds, e.g. the Card `gradient` variant. */
  inverse: 'text-inverse',
};

/** Pre-styled typography primitive covering every Tide Light text variant. */
export function Text({ variant = 'body', color = 'secondary', className, ...rest }: TextProps) {
  return (
    <RNText className={cn(variantClasses[variant], colorClasses[color], className)} {...rest} />
  );
}
