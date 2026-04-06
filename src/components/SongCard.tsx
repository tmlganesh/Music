import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../theme';
import { Song } from '../api/types';
import { getImageUrl, getArtistNames } from '../utils/getImageUrl';
import { formatDuration } from '../utils/formatTime';
import { usePlayerStore } from '../stores/playerStore';

interface SongCardProps {
  song: Song;
  index?: number;
  onPress: (song: Song) => void;
  onOptions?: (song: Song) => void;
  showIndex?: boolean;
}

import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

const AnimatedBar = ({ delay }: { delay: number }) => {
  const height = useSharedValue(4);

  React.useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(16, { duration: 400 }),
          withTiming(4, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const PlayingIndicator = () => (
  <View style={styles.playingIndicator}>
    <AnimatedBar delay={0} />
    <AnimatedBar delay={200} />
    <AnimatedBar delay={400} />
  </View>
);

const SongCard: React.FC<SongCardProps> = ({
  song,
  index,
  onPress,
  onOptions,
  showIndex = false,
}) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isCurrentSong = currentTrack?.id === song.id;

  return (
    <TouchableOpacity
      style={[styles.container, isCurrentSong && styles.activeContainer]}
      onPress={() => onPress(song)}
      onLongPress={() => onOptions?.(song)}
      activeOpacity={0.7}
    >
      {showIndex && (
        <View style={styles.indexContainer}>
          <Text style={styles.chartNumber}>{(index ?? 0) + 1}</Text>
          {isCurrentSong && isPlaying && (
            <View style={styles.indicatorOverlay}>
              <PlayingIndicator />
            </View>
          )}
        </View>
      )}

      <Image
        source={{ uri: getImageUrl(song.image, '150x150') }}
        style={styles.artwork}
      />

      <View style={styles.info}>
        <Text
          style={[styles.title, isCurrentSong && styles.activeText]}
          numberOfLines={1}
        >
          {song.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {getArtistNames(song.artists)}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.duration}>
          {formatDuration(song.duration || 0)}
        </Text>
        <TouchableOpacity
          style={styles.moreButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => onOptions?.(song)}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill={colors.textSecondary}>
            <Path d="M12 8C13.1 8 14 7.1 14 6C14 4.9 13.1 4 12 4C10.9 4 10 4.9 10 6C10 7.1 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18C14 16.9 13.1 16 12 16Z" />
          </Svg>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  activeContainer: {
    backgroundColor: colors.bgElevated,
  },
  indexContainer: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    position: 'relative',
  },
  chartNumber: {
    position: 'absolute',
    color: colors.textTertiary,
    fontSize: 24,
    fontWeight: '900',
    opacity: 0.15,
    fontStyle: 'italic',
  },
  indexText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  indicatorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeText: {
    color: colors.accentPrimary,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  duration: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  moreButton: {
    padding: 4,
  },
  // Playing indicator bars
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 2,
  },
  bar: {
    width: 3,
    backgroundColor: colors.accentPrimary,
    borderRadius: 1,
  },
  bar1: {
    height: 12,
  },
  bar2: {
    height: 8,
  },
  bar3: {
    height: 16,
  },
});

export default React.memo(SongCard);
