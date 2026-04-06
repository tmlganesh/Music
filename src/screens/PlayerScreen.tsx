import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../theme';
import { usePlayerStore, RepeatMode } from '../stores/playerStore';
import { useDownloadStore } from '../stores/downloadStore';
import audioService from '../services/audioService';
import SeekBar from '../components/SeekBar';
import { getImageUrl, getDownloadUrl, getArtistNames } from '../utils/getImageUrl';
import { formatTime } from '../utils/formatTime';

import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const scale = useSharedValue(1);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (isPlaying) {
      scale.value = withSpring(1.03, { damping: 15 });
    } else {
      scale.value = withSpring(1, { damping: 15 });
    }
  }, [isPlaying]);

  const animatedArtworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isLoading = usePlayerStore((s) => s.isLoading);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);

  const { downloadSong, isDownloaded, activeDownloads } = useDownloadStore();

  if (!currentTrack) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No song playing</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          >
            <Text style={styles.goBackText}>Browse Music</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCurrentDownloaded = isDownloaded(currentTrack.id);
  const downloadProgress = activeDownloads[currentTrack.id];
  const isDownloading = downloadProgress !== undefined;

  const handleSeek = async (ms: number) => {
    await audioService.seekTo(ms);
  };

  const handlePlayPause = async () => {
    await audioService.togglePlayPause();
  };

  const handleNext = async () => {
    await audioService.playNext();
  };

  const handlePrevious = async () => {
    await audioService.playPrevious();
  };

  const handleShuffle = () => {
    usePlayerStore.getState().toggleShuffle();
  };

  const handleRepeat = () => {
    usePlayerStore.getState().toggleRepeat();
  };

  const handleOptions = () => {
    Alert.alert(
      currentTrack.name,
      `Artist: ${getArtistNames(currentTrack.artists)}\nAlbum: ${currentTrack.album?.name || 'Unknown Album'}`,
      [
        { text: 'Add to Queue', onPress: () => usePlayerStore.getState().addToQueue(currentTrack) },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const resolveCurrentTrackDownloadUrl = async (): Promise<string | null> => {
    let resolvedUrl = getDownloadUrl(currentTrack.downloadUrl);
    if (resolvedUrl) return resolvedUrl;

    try {
      const { getSongById } = await import('../api/songs');
      const freshData = await getSongById(currentTrack.id);
      if (freshData.success && freshData.data.length > 0) {
        resolvedUrl = getDownloadUrl(freshData.data[0].downloadUrl);
      }
    } catch (error) {
      console.error('Failed to resolve download URL:', error);
    }

    return resolvedUrl;
  };

  const handleDownload = async () => {
    if (isDownloading) return;

    if (isCurrentDownloaded) {
      Alert.alert('Already Downloaded', 'This song is already saved on your device.');
      return;
    }

    if (Platform.OS === 'web') {
      const downloadUrl = await resolveCurrentTrackDownloadUrl();
      if (!downloadUrl) {
        Alert.alert('Error', 'No download URL available for this song.');
        return;
      }

      try {
        const openExternal = (globalThis as { open?: (url: string, target?: string, features?: string) => unknown }).open;
        if (typeof openExternal === 'function') {
          openExternal(downloadUrl, '_blank', 'noopener,noreferrer');
        } else {
          await Linking.openURL(downloadUrl);
        }
      } catch (error) {
        console.error('Web download open failed:', error);
        Alert.alert('Download Failed', 'Could not open the download link. Please try again.');
      }
      return;
    }

    const success = await downloadSong(currentTrack);
    if (success) {
      Alert.alert('Download Complete', `${currentTrack.name} is ready for offline playback.`);
    } else {
      Alert.alert('Download Failed', 'Could not download this song right now. Please try again.');
    }
  };

  const getRepeatIcon = (mode: RepeatMode) => {
    if (mode === 'one') {
      return (
        <View>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={colors.accentPrimary}>
            <Path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z" />
          </Svg>
          <View style={styles.repeatOneDot}>
            <Text style={styles.repeatOneText}>1</Text>
          </View>
        </View>
      );
    }
    return (
      <Svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill={mode === 'all' ? colors.accentPrimary : colors.textSecondary}
      >
        <Path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z" />
      </Svg>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      {/* Gradient background glow */}
      <LinearGradient
        colors={['rgba(79, 70, 229, 0.15)', colors.bgPrimary, colors.bgPrimary]}
        style={styles.gradientBg}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topBarButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.textPrimary}>
            <Path d="M19 11H7.83L12.41 6.41L11 5L4 12L11 19L12.41 17.59L7.83 13H19V11Z" />
          </Svg>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarLabel}>NOW PLAYING</Text>
          <Text style={styles.topBarQueueInfo}>
            {queueIndex + 1} / {queue.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOptions}
          style={styles.topBarButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.textSecondary}>
            <Path d="M12 8C13.1 8 14 7.1 14 6C14 4.9 13.1 4 12 4C10.9 4 10 4.9 10 6C10 7.1 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18C14 16.9 13.1 16 12 16Z" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Album art */}
      <View style={styles.artworkContainer}>
        <Animated.View style={[styles.artworkShadow, animatedArtworkStyle]}>
          <Image
            source={{ uri: getImageUrl(currentTrack.image, '500x500') }}
            style={styles.artwork}
          />
          {/* Buffering overlay */}
          {(isLoading || isBuffering) && (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator size="large" color={colors.accentPrimary} />
              <Text style={styles.bufferingText}>
                {isLoading ? 'Loading...' : 'Buffering...'}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Song info */}
      <View style={styles.songInfo}>
        <View style={styles.songTitleRow}>
          <View style={styles.songTitleContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {getArtistNames(currentTrack.artists)}
            </Text>
          </View>

          {/* Download button */}
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.actionButton}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <View style={styles.downloadProgress}>
                <Text style={styles.downloadProgressText}>
                  {Math.round((downloadProgress || 0) * 100)}%
                </Text>
              </View>
            ) : (
              <Svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill={isCurrentDownloaded ? colors.accentPrimary : colors.textSecondary}
              >
                <Path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V12H16L12 16L8 12H11V7Z" />
              </Svg>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Seek bar */}
      <View style={styles.seekBarContainer}>
        <SeekBar
          position={position}
          duration={duration}
          onSeek={handleSeek}
        />
        <View style={styles.timeLabels}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { pointerEvents: 'auto' }]}>
        <TouchableOpacity onPress={handleShuffle} style={styles.sideControl}>
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill={shuffleMode ? colors.accentPrimary : colors.textSecondary}
          >
            <Path d="M10.59 9.17L5.41 4L4 5.41L9.17 10.58L10.59 9.17ZM14.5 4L16.54 6.04L4 18.59L5.41 20L17.96 7.46L20 9.5V4H14.5ZM14.83 13.41L13.42 14.82L16.55 17.95L14.5 20H20V14.5L17.96 16.54L14.83 13.41Z" />
          </Svg>
          {shuffleMode && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePrevious}
          style={styles.controlButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24" fill={colors.textPrimary}>
            <Path d="M6 6H8V18H6V6ZM9.5 12L18 18V6L9.5 12Z" />
          </Svg>
        </TouchableOpacity>

        {/* Play/Pause button */}
        <TouchableOpacity 
          onPress={handlePlayPause} 
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[colors.accentSecondary, colors.accentPrimary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : isPlaying ? (
              <Svg width={28} height={28} viewBox="0 0 24 24" fill={colors.white}>
                <Path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" />
              </Svg>
            ) : (
              <Svg width={28} height={28} viewBox="0 0 24 24" fill={colors.white}>
                <Path d="M8 5V19L19 12L8 5Z" />
              </Svg>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.controlButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24" fill={colors.textPrimary}>
            <Path d="M6 18L14.5 12L6 6V18ZM16 6V18H18V6H16Z" />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRepeat} style={styles.sideControl}>
          {getRepeatIcon(repeatMode)}
          {repeatMode !== 'off' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  goBackButton: {
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  goBackText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.lg,
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  topBarQueueInfo: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  artworkShadow: {
    // @ts-ignore - boxShadow is supported in react-native-web 0.19+
    boxShadow: `0 12px 24px ${colors.glowColor}`,
    elevation: 20,
    position: 'relative',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.bgElevated,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingText: {
    color: colors.white,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  songInfo: {
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  songTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  songTitleContainer: {
    flex: 1,
    marginRight: spacing.lg,
  },
  songTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  songArtist: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  actionButton: {
    padding: spacing.sm,
  },
  downloadProgress: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadProgressText: {
    color: colors.accentPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  seekBarContainer: {
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing['3xl'],
    marginTop: spacing.lg,
  },
  sideControl: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  controlButton: {
    padding: spacing.sm,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    boxShadow: `0 4px 12px ${colors.glowColorStrong}`,
    elevation: 8,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentPrimary,
    marginTop: 4,
  },
  repeatOneDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.accentPrimary,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '800',
  },
});

export default PlayerScreen;
