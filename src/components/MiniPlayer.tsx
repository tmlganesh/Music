import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Svg, Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius } from '../theme';
import { usePlayerStore } from '../stores/playerStore';
import audioService from '../services/audioService';
import { getImageUrl, getArtistNames } from '../utils/getImageUrl';
import { RootStackParamList } from '../navigation/types';
import { useSafeInsets } from '../utils/useSafeInsets';

const MiniPlayer: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeInsets();
  const bottomOffset = 56 + Math.max(insets.bottom, 8);
  
  const currentRouteName = usePlayerStore((s) => s.currentRoute);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);

  // Don't show if no track, or if we're already on the full Player screen
  if (!currentTrack || currentRouteName === 'Player') return null;

  const progress = duration > 0 ? position / duration : 0;

  const handlePlayPause = async () => {
    await audioService.togglePlayPause();
  };

  const handleNext = async () => {
    await audioService.playNext();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { bottom: bottomOffset }]}
      activeOpacity={0.95}
      onPress={() => navigation.navigate('Player')}
    >
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Progress bar at top */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: getImageUrl(currentTrack.image, '150x150') }}
          style={styles.artwork}
        />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {getArtistNames(currentTrack.artists)}
            {isBuffering ? ' • Buffering...' : ''}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : isPlaying ? (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.textPrimary}>
                <Path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" />
              </Svg>
            ) : (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.textPrimary}>
                <Path d="M8 5V19L19 12L8 5Z" />
              </Svg>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={styles.nextButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.textSecondary}>
              <Path d="M5 4L15 12L5 20V4ZM19 4V20H16V4H19Z" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.miniPlayerBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    overflow: 'hidden',
    // @ts-ignore
    boxShadow: `0 -4px 12px rgba(0, 0, 0, 0.5)`,
    elevation: 10,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: colors.seekTrackBg,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accentPrimary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  playButton: {
    padding: 4,
  },
  nextButton: {
    padding: 4,
  },
});

export default React.memo(MiniPlayer);
