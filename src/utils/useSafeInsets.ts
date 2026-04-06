import { useContext } from 'react';
import { EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';

const ZERO_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Returns safe-area insets when available and falls back to zeros.
 * This avoids runtime crashes if context is temporarily unavailable.
 */
export const useSafeInsets = (): EdgeInsets => {
  return useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;
};
