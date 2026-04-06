// Sarvam AI-inspired dark theme color palette
// Blue-to-orange gradient spectrum with deep dark backgrounds

export const colors = {
  // Backgrounds
  bgPrimary: '#0A0A0F',
  bgSurface: '#12121A',
  bgElevated: '#1A1A2E',
  bgInput: '#16161F',

  // Accent Colors
  accentPrimary: '#FF6B35',
  accentPrimaryLight: '#FF8F5E',
  accentSecondary: '#4F46E5',
  accentSecondaryLight: '#6366F1',
  accentGlow: 'rgba(255, 107, 53, 0.15)',
  accentGlowStrong: 'rgba(255, 107, 53, 0.3)',
  glowColor: 'rgba(79, 70, 229, 0.4)',
  glowColorStrong: 'rgba(255, 107, 107, 0.5)',

  // Text
  textPrimary: '#F5F5F7',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textAccent: '#FF8F5E',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.12)',

  // Functional
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Gradient stops
  gradientStart: '#4F46E5',
  gradientEnd: '#FF6B35',
  gradientMid: '#8B5CF6',

  // Tab bar
  tabActive: '#FF6B35',
  tabInactive: '#6B7280',

  // Player
  seekTrackBg: 'rgba(255, 255, 255, 0.1)',
  seekTrackFill: '#FF6B35',
  miniPlayerBg: 'rgba(18, 18, 26, 0.85)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // White & Black
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
