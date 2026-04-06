import { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

// Fallback for before fonts load
export const systemFonts = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  extraBold: 'System',
} as const;

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
  captionMedium: {
    fontSize: 13,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  time: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
} as const;

export type TypographyKey = keyof typeof typography;
