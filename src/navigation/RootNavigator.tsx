import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import PlayerScreen from '../screens/PlayerScreen';
import ArtistScreen from '../screens/ArtistScreen';
import MiniPlayer from '../components/MiniPlayer';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

import { usePlayerStore } from '../stores/playerStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const setCurrentRoute = usePlayerStore((s) => s.setCurrentRoute);

  return (
    <NavigationContainer
      onStateChange={(state) => {
        const currentRoute = state?.routes[state.index]?.name;
        if (currentRoute) {
          setCurrentRoute(currentRoute);
        }
      }}
      theme={{
        dark: true,
        colors: {
          primary: colors.accentPrimary,
          background: colors.bgPrimary,
          card: colors.bgSurface,
          text: colors.textPrimary,
          border: colors.borderSubtle,
          notification: colors.accentPrimary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <View style={styles.container}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
          }}
        >
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
        <MiniPlayer />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});

export default RootNavigator;
