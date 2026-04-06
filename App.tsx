import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { usePlayerStore } from './src/stores/playerStore';
import { useDownloadStore } from './src/stores/downloadStore';
import { useSearchStore } from './src/stores/searchStore';
import { colors } from './src/theme';
import { LogBox } from 'react-native';
import audioService from './src/services/audioService';

// Suppress deprecated props warnings from libraries (e.g. @react-navigation/stack)
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'style.pointerEvents',
]);

const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const firstArg = args[0];
  if (
    typeof firstArg === 'string' &&
    firstArg.includes('props.pointerEvents is deprecated')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};



export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Rehydrate persisted state
        await Promise.all([
          audioService.initialize(),
          usePlayerStore.getState().rehydrate(),
          useDownloadStore.getState().loadDownloads(),
          useSearchStore.getState().loadHistory(),
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
