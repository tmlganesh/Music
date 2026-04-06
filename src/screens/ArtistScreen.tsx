import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path } from 'react-native-svg';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getArtistById } from '../api/artists';
import { Artist, Song } from '../api/types';
import { getImageUrl } from '../utils/getImageUrl';
import { formatCount } from '../utils/formatTime';
import SongCard from '../components/SongCard';
import audioService from '../services/audioService';
import { usePlayerStore } from '../stores/playerStore';
import storage from '../utils/storage';
import { FALLBACK_SONGS } from '../api/fallbackSongs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ArtistScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Artist'>>();
  const { artistId, artistName } = route.params;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  useEffect(() => {
    loadArtist();
  }, [artistId]);

  const loadArtist = async () => {
    try {
      setIsLoading(true);
      setErrorText(null);
      const res = await getArtistById(artistId, 20, 10);
      setArtist(res.data);
    } catch (error) {
      const queueSongs = usePlayerStore.getState().queue;
      const recentSongs = ((await storage.getRecentlyPlayed()) as Song[]) || [];
      const localPool = [...queueSongs, ...recentSongs, ...FALLBACK_SONGS];
      const localSongs = localPool
        .filter((song) => song.artists?.primary?.some((a) => a.id === artistId || a.name === artistName))
        .filter((song, index, self) => self.findIndex((s) => s.id === song.id) === index)
        .slice(0, 20);

      if (localSongs.length > 0) {
        const artistImage = localSongs[0].artists?.primary?.[0]?.image || localSongs[0].image;
        setArtist({
          id: artistId,
          name: artistName || localSongs[0].artists?.primary?.[0]?.name || 'Unknown Artist',
          url: '',
          type: 'artist',
          image: artistImage,
          followerCount: null,
          fanCount: null,
          isVerified: false,
          dominantLanguage: null,
          dominantType: null,
          bio: null,
          dob: null,
          fb: null,
          twitter: null,
          wiki: null,
          availableLanguages: ['hindi'],
          isRadioPresent: null,
          topSongs: localSongs,
          topAlbums: null,
          singles: null,
          similarArtists: null,
        });
        setErrorText('Live artist data is unavailable right now. Showing local tracks.');
      } else {
        setArtist(null);
        setErrorText('Artist data is temporarily unavailable. Please retry shortly.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongPress = async (song: Song) => {
    const songs = artist?.topSongs || [];
    const index = songs.findIndex((s) => s.id === song.id);
    await audioService.play(song, songs, index >= 0 ? index : 0);
  };

  const handleShufflePlay = async () => {
    if (!artist?.topSongs?.length) return;
    const songs = [...artist.topSongs];
    // Shuffle
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    await audioService.play(songs[0], songs, 0);
    usePlayerStore.getState().toggleShuffle();
  };

  const handleAddToQueue = (song: Song) => {
    usePlayerStore.getState().addToQueue(song);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorText || 'Artist not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadArtist}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        data={artist?.topSongs || []}
        renderItem={({ item, index }) => (
          <SongCard
            song={item}
            index={index}
            onPress={handleSongPress}
            onOptions={handleAddToQueue}
            showIndex
          />
        )}
        keyExtractor={(item) => `artist-song-${item.id}`}
        ListHeaderComponent={
          <View>
            {/* Hero header */}
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: getImageUrl(artist.image, '500x500') }}
                style={styles.heroImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(10, 10, 15, 0.7)', colors.bgPrimary]}
                style={styles.heroGradient}
              />

              {/* Back button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.white}>
                  <Path d="M19 11H7.83L12.41 6.41L11 5L4 12L11 19L12.41 17.59L7.83 13H19V11Z" />
                </Svg>
              </TouchableOpacity>

              {/* Artist info overlay */}
              <View style={styles.heroInfo}>
                {artist.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill={colors.accentPrimary}>
                      <Path d="M12 1L14.92 5.18L20 6.46L16.64 10.92L17 16.18L12 14.27L7 16.18L7.36 10.92L4 6.46L9.08 5.18L12 1Z" />
                    </Svg>
                    <Text style={styles.verifiedText}>Verified Artist</Text>
                  </View>
                )}
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.followerCount}>
                  {formatCount(artist.followerCount)} followers
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={handleShufflePlay}
              >
                <LinearGradient
                  colors={[colors.accentSecondary, colors.accentPrimary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shuffleGradient}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.white}>
                    <Path d="M10.59 9.17L5.41 4L4 5.41L9.17 10.58L10.59 9.17ZM14.5 4L16.54 6.04L4 18.59L5.41 20L17.96 7.46L20 9.5V4H14.5ZM14.83 13.41L13.42 14.82L16.55 17.95L14.5 20H20V14.5L17.96 16.54L14.83 13.41Z" />
                  </Svg>
                  <Text style={styles.shuffleText}>Shuffle Play</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Top Songs header */}
            <Text style={styles.sectionTitle}>Top Songs</Text>
            {!!errorText && <Text style={styles.bannerText}>{errorText}</Text>}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          currentTrack ? { paddingBottom: 140 } : { paddingBottom: 20 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgElevated,
  },
  retryText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  heroContainer: {
    height: SCREEN_WIDTH * 0.8,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgElevated,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  backButton: {
    position: 'absolute',
    top: spacing['5xl'],
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  verifiedText: {
    color: colors.accentPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  artistName: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  followerCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  shuffleButton: {
    flex: 1,
  },
  shuffleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  shuffleText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  bannerText: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default ArtistScreen;
