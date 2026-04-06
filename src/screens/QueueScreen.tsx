import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing, borderRadius } from '../theme';
import { usePlayerStore } from '../stores/playerStore';
import audioService from '../services/audioService';
import { Song } from '../api/types';
import { getImageUrl, getArtistNames } from '../utils/getImageUrl';
import { formatDuration } from '../utils/formatTime';

const QueueScreen: React.FC = () => {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const upNext = queue.slice(queueIndex + 1);
  const played = queue.slice(0, queueIndex);

  const handleSongPress = async (song: Song, globalIndex: number) => {
    if (globalIndex < 0 || globalIndex >= queue.length) return;
    await audioService.play(song, queue, globalIndex);
  };

  const handleRemove = (globalIndex: number) => {
    if (globalIndex === queueIndex) {
      Alert.alert('Cannot remove', 'This song is currently playing');
      return;
    }
    usePlayerStore.getState().removeFromQueue(globalIndex);
  };

  const handleMove = (globalIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;
    usePlayerStore.getState().reorderQueue(globalIndex, targetIndex);
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear the entire queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            audioService.stop();
            usePlayerStore.getState().clearQueue();
          },
        },
      ]
    );
  };

  const renderQueueItem = (song: Song, globalIndex: number, isCurrentlyPlaying: boolean) => {
    const canMoveUp = globalIndex > 0;
    const canMoveDown = globalIndex < queue.length - 1;

    return (
      <TouchableOpacity
        key={`queue-${song.id}-${globalIndex}`}
        style={[styles.queueItem, isCurrentlyPlaying && styles.currentItem]}
        onPress={() => handleSongPress(song, globalIndex)}
        activeOpacity={0.7}
      >
        <View style={styles.dragHandle}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill={colors.textTertiary}>
            <Path d="M3 15H21V13H3V15ZM3 19H21V17H3V19ZM3 11H21V9H3V11ZM3 5V7H21V5H3Z" />
          </Svg>
        </View>

        <Image
          source={{ uri: getImageUrl(song.image, '150x150') }}
          style={styles.artwork}
        />

        <View style={styles.info}>
          <Text
            style={[styles.title, isCurrentlyPlaying && styles.activeTitle]}
            numberOfLines={1}
          >
            {song.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {getArtistNames(song.artists)}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.duration}>{formatDuration(song.duration || 0)}</Text>

          <View style={styles.reorderControls}>
            <TouchableOpacity
              onPress={() => handleMove(globalIndex, 'up')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.reorderButton, !canMoveUp && styles.disabledControl]}
              disabled={!canMoveUp}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill={canMoveUp ? colors.textSecondary : colors.textTertiary}>
                <Path d="M7 14L12 9L17 14H7Z" />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMove(globalIndex, 'down')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.reorderButton, !canMoveDown && styles.disabledControl]}
              disabled={!canMoveDown}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill={canMoveDown ? colors.textSecondary : colors.textTertiary}>
                <Path d="M7 10L12 15L17 10H7Z" />
              </Svg>
            </TouchableOpacity>
          </View>

          {!isCurrentlyPlaying && (
            <TouchableOpacity
              onPress={() => handleRemove(globalIndex)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.removeButton}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill={colors.textTertiary}>
                <Path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue</Text>
        {queue.length > 0 && (
          <TouchableOpacity onPress={handleClearQueue}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill={colors.textTertiary}>
            <Path d="M4 6H20M4 12H14M4 18H10M16 14V22M13 18H19" />
          </Svg>
          <Text style={styles.emptyText}>Your queue is empty</Text>
          <Text style={styles.emptySubtext}>
            Search for songs and add them to your queue
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {/* Now Playing */}
              {currentTrack && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Now Playing</Text>
                  {renderQueueItem(currentTrack, queueIndex, true)}
                </View>
              )}

              {/* Up Next */}
              {upNext.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Up Next</Text>
                    <Text style={styles.sectionCount}>
                      {upNext.length} song{upNext.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {upNext.map((song, i) =>
                    renderQueueItem(song, queueIndex + 1 + i, false)
                  )}
                </View>
              )}

              {/* Previously Played */}
              {played.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Previously Played</Text>
                  {played.map((song, i) =>
                    renderQueueItem(song, i, false)
                  )}
                </View>
              )}
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            currentTrack ? { paddingBottom: 140 } : { paddingBottom: 20 },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  clearText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionCount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  currentItem: {
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentPrimary,
  },
  dragHandle: {
    padding: spacing.sm,
    marginRight: spacing.xs,
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
  activeTitle: {
    color: colors.accentPrimary,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  duration: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  reorderControls: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 4,
  },
  reorderButton: {
    padding: 2,
  },
  disabledControl: {
    opacity: 0.35,
  },
  removeButton: {
    padding: 2,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: 20,
  },
});

export default QueueScreen;
