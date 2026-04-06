import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabParamList, HomeStackParamList, SearchStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import QueueScreen from '../screens/QueueScreen';
import ArtistScreen from '../screens/ArtistScreen';
import AlbumScreen from '../screens/AlbumScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import { colors } from '../theme';
import { useSafeInsets } from '../utils/useSafeInsets';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();

const HomeStackScreens = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="Artist" component={ArtistScreen} />
    <HomeStack.Screen name="Album" component={AlbumScreen} />
    <HomeStack.Screen name="Playlist" component={PlaylistScreen} />
  </HomeStack.Navigator>
);

const SearchStackScreens = () => (
  <SearchStack.Navigator screenOptions={{ headerShown: false }}>
    <SearchStack.Screen name="SearchScreen" component={SearchScreen} />
    <SearchStack.Screen name="Artist" component={ArtistScreen} />
    <SearchStack.Screen name="Album" component={AlbumScreen} />
    <SearchStack.Screen name="Playlist" component={PlaylistScreen} />
  </SearchStack.Navigator>
);

// Custom SVG icons
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const QueueIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6H20M4 12H14M4 18H10M16 14V22M13 18H19"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TabNavigator: React.FC = () => {
  const insets = useSafeInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
        ],
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStackScreens}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchStack"
        component={SearchStackScreens}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarIcon: ({ color, size }) => <QueueIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabItem: {
    paddingVertical: 4,
  },
});

export default TabNavigator;
