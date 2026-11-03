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

export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse' | 'error';

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
  error: 'text-error',
};

// Plain (unprefixed) arbitrary sizes like `text-[12px]` / `leading-[16px]` in className.
const ARBITRARY_FONT_SIZE = /(?:^|\s)text-\[(\d+(?:\.\d+)?)px\](?=\s|$)/;
const ARBITRARY_LINE_HEIGHT = /(?:^|\s)leading-\[(\d+(?:\.\d+)?)px\](?=\s|$)/;

/** Pre-styled typography primitive covering every Tide Light text variant. */
export function Text({ variant = 'body', color = 'secondary', className, style, ...rest }: TextProps) {
  // `cn` only joins, so a `text-[12px]` override sat next to the variant's own size class
  // (`text-body` etc.) and whichever Tailwind happened to emit later won — usually the
  // variant, so most size overrides were silently ignored (and with numberOfLines the class
  // didn't reach the text at all). Applying it as an inline style makes it always win; an
  // explicit `style` from the caller still overrides it.
  const sizeMatch = className ? ARBITRARY_FONT_SIZE.exec(className) : null;
  const leadingMatch = className ? ARBITRARY_LINE_HEIGHT.exec(className) : null;
  const sizeStyle =
    sizeMatch || leadingMatch
      ? { ...(sizeMatch && { fontSize: Number(sizeMatch[1]) }), ...(leadingMatch && { lineHeight: Number(leadingMatch[1]) }) }
      : undefined;

  return (
    <RNText
      className={cn(variantClasses[variant], colorClasses[color], className)}
      style={sizeStyle ? [sizeStyle, style] : style}
      {...rest}
    />
  );
}
