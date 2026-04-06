import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, borderRadius } from '../theme';
import { RootStackParamList, HomeStackParamList } from '../navigation/types';
import { searchSongs, getSongsByIds } from '../api/songs';
import { Song, ArtistMini, Album, Playlist } from '../api/types';
import { getImageUrl, isPlaceholderImage } from '../utils/getImageUrl';
import SongCard from '../components/SongCard';
import audioService from '../services/audioService';
import storage from '../utils/storage';
import { usePlayerStore } from '../stores/playerStore';
import { isApiCooldownActive, resetApiCooldown } from '../api/client';
import { FALLBACK_SONGS, FALLBACK_SONG_IDS } from '../api/fallbackSongs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HOME_CACHE_KEY = '@loko_home_cache';

// Hindi search queries to rotate through for variety
const HINDI_QUERIES = [
  'trending hindi songs',
  'bollywood latest',
  'arijit singh',
  'hindi romantic songs',
  'bollywood hits 2024',
  'neha kakkar',
  'pritam',
  'jubin nautiyal',
];

type CachedHomeData = {
  trendingSongs: Song[];
  popularArtists: ArtistMini[];
  popularAlbums: Album[];
  popularPlaylists: Playlist[];
  suggestions: Song[];
  cachedAt: number;
};

const deriveArtistsFromSongs = (songs: Song[]): ArtistMini[] => {
  const artistMap = new Map<string, ArtistMini>();
  songs.forEach((song) => {
    song.artists?.primary?.forEach((artist) => {
      if (artist?.id && !artistMap.has(artist.id)) {
        artistMap.set(artist.id, artist);
      }
    });
  });

  return Array.from(artistMap.values()).slice(0, 8);
};

const deriveAlbumsFromSongs = (songs: Song[]): Album[] => {
  const albumMap = new Map<string, Album>();
  songs.forEach((song) => {
    const albumId = song.album?.id;
    if (!albumId || albumMap.has(albumId)) return;
    // Allow placeholder images through — fallback songs still need albums shown

    albumMap.set(albumId, {
      id: albumId,
      name: song.album?.name || 'Unknown Album',
      description: '',
      year: song.year ? Number(song.year) || null : null,
      type: 'album',
      playCount: null,
      language: song.language || 'hindi',
      explicitContent: song.explicitContent,
      artists: song.artists,
      songCount: null,
      url: song.album?.url || song.url,
      image: song.image,
      songs: null,
    });
  });

  return Array.from(albumMap.values()).slice(0, 8);
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>();
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<ArtistMini[]>([]);
  const [popularAlbums, setPopularAlbums] = useState<Album[]>([]);
  const [popularPlaylists, setPopularPlaylists] = useState<Playlist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queryIndexRef = useRef(0);
  const currentQueryRef = useRef(HINDI_QUERIES[0]);

  const applyHomeData = useCallback((data: Omit<CachedHomeData, 'cachedAt'>) => {
    setTrendingSongs(data.trendingSongs);
    setPopularArtists(data.popularArtists);
    setPopularAlbums(data.popularAlbums);
    setPopularPlaylists(data.popularPlaylists);
    setSuggestions(data.suggestions);
    setPage(0);
    setHasMore(data.trendingSongs.length >= 20);
  }, []);

  const loadCachedHomeData = useCallback(async () => {
    const cached = await storage.get<CachedHomeData>(HOME_CACHE_KEY);
    if (!cached) return false;

    const cachedSongs = cached.trendingSongs || [];
    if (cachedSongs.length === 0) return false;
    
    const derivedArtists = deriveArtistsFromSongs(cachedSongs);
    const derivedAlbums = deriveAlbumsFromSongs(cachedSongs);

    applyHomeData({
      trendingSongs: cachedSongs,
      popularArtists: (cached.popularArtists || []).length > 0 ? (cached.popularArtists || []) : derivedArtists,
      popularAlbums: (cached.popularAlbums || []).length > 0 ? (cached.popularAlbums || []) : derivedAlbums,
      popularPlaylists: cached.popularPlaylists || [],
      suggestions: (cached.suggestions || []).length > 0 ? (cached.suggestions || []) : cachedSongs.slice(0, 5),
    });
    setIsUsingCachedData(true);
    return true;
  }, [applyHomeData]);

  const saveCachedHomeData = useCallback(async (data: Omit<CachedHomeData, 'cachedAt'>) => {
    await storage.set(HOME_CACHE_KEY, {
      ...data,
      cachedAt: Date.now(),
    } as CachedHomeData);
  }, []);

  /**
   * Try to fetch fresh songs for the fallback IDs directly.
   * This bypasses search and uses the /api/songs endpoint.
   */
  const fetchFallbackSongsDirectly = useCallback(async (): Promise<Song[]> => {
    try {
      const result = await getSongsByIds(FALLBACK_SONG_IDS.slice(0, 8));
      if (result.success && result.data.length > 0) {
        console.log(`Fetched ${result.data.length} fallback songs directly from API`);
        return result.data;
      }
    } catch (e) {
      console.log('Could not fetch fallback songs directly either');
    }
    return [];
  }, []);

  const loadData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        resetApiCooldown(); // Clear any cooldown on manual refresh
      } else {
        setIsLoading(true);
      }

      setIsUsingCachedData(false);

      // Pick a Hindi-focused query
      const queryIndex = queryIndexRef.current;
      const searchQuery = HINDI_QUERIES[queryIndex % HINDI_QUERIES.length];
      currentQueryRef.current = searchQuery;
      queryIndexRef.current = queryIndex + 1;

      let songsRes;
      try {
        songsRes = await searchSongs(searchQuery, 0, 20);
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        if (status === 429 || !axiosError.response) {
          // Try cached data first
          const usedCache = await loadCachedHomeData();
          if (usedCache) {
            setHasMore(false);
            return;
          }
          
          // Don't make more API calls — they'll also be rate limited.
          // Use static fallback data immediately.
          const recent = await storage.getRecentlyPlayed();
          const recentSongs = (recent as Song[]) || [];
          const fetchedFallback = await fetchFallbackSongsDirectly();
          const baseSongs =
            recentSongs.length > 0
              ? recentSongs
              : fetchedFallback.length > 0
                ? fetchedFallback
                : FALLBACK_SONGS;
          
          const fallbackArtists = deriveArtistsFromSongs(baseSongs);
          const fallbackAlbums = deriveAlbumsFromSongs(baseSongs);
          applyHomeData({
            trendingSongs: baseSongs,
            popularArtists: fallbackArtists,
            popularAlbums: fallbackAlbums,
            popularPlaylists: [],
            suggestions: baseSongs.slice(0, 5),
          });
          setRecentlyPlayed(baseSongs);
          setIsUsingCachedData(true);
          setHasMore(false);
          console.log('API rate limited (429). Showing local/fallback data.');
          return;
        }
        throw error;
      }

      const recent = await storage.getRecentlyPlayed();

      // Process songs - filter to Hindi/Bollywood if possible
      const uniqueSongs = (songsRes.data?.results || []).filter(
        (song, index, self) => self.findIndex((s) => s.id === song.id) === index
      );

      const filteredArtists = deriveArtistsFromSongs(uniqueSongs);
      const albumsWithImages = deriveAlbumsFromSongs(uniqueSongs);

      const playlistsWithImages: Playlist[] = [];

      applyHomeData({
        trendingSongs: uniqueSongs,
        popularArtists: filteredArtists,
        popularAlbums: albumsWithImages,
        popularPlaylists: playlistsWithImages,
        suggestions: uniqueSongs.slice(0, 5),
      });
      setRecentlyPlayed(recent as Song[]);
      setHasMore(songsRes.data.total > 20);
      await saveCachedHomeData({
        trendingSongs: uniqueSongs,
        popularArtists: filteredArtists,
        popularAlbums: albumsWithImages,
        popularPlaylists: playlistsWithImages,
        suggestions: uniqueSongs.slice(0, 5),
      });

    } catch {
      // Non-429 errors (network issues, etc.)
      const recent = await storage.getRecentlyPlayed();
      const recentSongs = (recent as Song[]) || [];
      const fetchedFallback = await fetchFallbackSongsDirectly();
      const baseSongs =
        recentSongs.length > 0
          ? recentSongs
          : fetchedFallback.length > 0
            ? fetchedFallback
            : FALLBACK_SONGS;

      if (baseSongs.length > 0) {
        const fallbackArtists = deriveArtistsFromSongs(baseSongs);
        const fallbackAlbums = deriveAlbumsFromSongs(baseSongs);
        applyHomeData({
          trendingSongs: baseSongs,
          popularArtists: fallbackArtists,
          popularAlbums: fallbackAlbums,
          popularPlaylists: [],
          suggestions: baseSongs.slice(0, 5),
        });
        setRecentlyPlayed(baseSongs);
        setIsUsingCachedData(true);
      }
      setHasMore(false);
      console.log('Home feed unavailable from API; showing local fallback.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [applyHomeData, fetchFallbackSongsDirectly, loadCachedHomeData, saveCachedHomeData]);

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasUserScrolled) return;
    if (event.nativeEvent.contentOffset.y > 24) {
      setHasUserScrolled(true);
    }
  }, [hasUserScrolled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload recently played when coming back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const recent = await storage.getRecentlyPlayed();
      setRecentlyPlayed(recent as Song[]);
    });
    return unsubscribe;
  }, [navigation]);

  const loadMore = async () => {
    if (!hasUserScrolled || !hasMore || isLoading || isLoadingMore || isApiCooldownActive()) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await searchSongs(currentQueryRef.current, nextPage, 20);
      setTrendingSongs((prev) => [...prev, ...res.data.results]);
      setPage(nextPage);
      setHasMore(res.data.results.length === 20);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSongPress = async (song: Song) => {
    await audioService.play(song, trendingSongs, trendingSongs.findIndex((s) => s.id === song.id));
  };

  const handleRecentPress = async (song: Song) => {
    await audioService.play(song, recentlyPlayed, recentlyPlayed.findIndex((s) => s.id === song.id));
  };

  const handleSuggestionPress = async (song: Song) => {
    await audioService.play(song, suggestions, suggestions.findIndex((s) => s.id === song.id));
  };

  const handleArtistPress = (artist: ArtistMini) => {
    navigation.navigate('Artist', { artistId: artist.id, artistName: artist.name });
  };

  const handleAlbumPress = (album: Album) => {
    navigation.navigate('Album', { albumId: album.id, albumName: album.name });
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    navigation.navigate('Playlist', { playlistId: playlist.id, playlistName: playlist.name });
  };

  const handleOptions = (song: Song) => {
    Alert.alert(
      song.name,
      `Artist: ${song.artists?.primary?.[0]?.name || 'Unknown Artist'}`,
      [
        {
          text: 'Add to Queue',
          onPress: () => {
            usePlayerStore.getState().addToQueue(song);
          }
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const renderArtistItem = ({ item }: { item: ArtistMini }) => (
    <TouchableOpacity
      style={styles.artistCard}
      onPress={() => handleArtistPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUrl(item.image, '150x150') }}
        style={styles.artistImage}
      />
      <Text style={styles.artistName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.recentCard}
      onPress={() => handleAlbumPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUrl(item.image, '150x150') }}
        style={styles.recentImage}
      />
      <Text style={styles.recentTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.recentArtist} numberOfLines={1}>
        {item.artists?.primary?.[0]?.name || ''}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={styles.recentCard}
      onPress={() => handleRecentPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUrl(item.image, '150x150') }}
        style={styles.recentImage}
      />
      <Text style={styles.recentTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.recentArtist} numberOfLines={1}>
        {item.artists?.primary?.[0]?.name || ''}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.recentCard}
      onPress={() => handlePlaylistPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUrl(item.image, '150x150') }}
        style={styles.recentImage}
      />
      <Text style={styles.recentTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.recentArtist} numberOfLines={1}>
        {item.songCount || 0} Songs
      </Text>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getGreeting()}</Text>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.logoMark} />
            <Text style={styles.appTitle}>Loko Music</Text>
          </View>
          {isUsingCachedData && <Text style={styles.cachedHint}>Showing cached data</Text>}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('SearchStack' as any)}
          style={styles.searchButton}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
              stroke={colors.textPrimary}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <FlatList
            data={recentlyPlayed.slice(0, 10)}
            renderItem={renderRecentItem}
            keyExtractor={(item) => `recent-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Popular Artists */}
      {popularArtists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Artists</Text>
          <FlatList
            data={popularArtists}
            renderItem={renderArtistItem}
            keyExtractor={(item) => `artist-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Top Albums */}
      {popularAlbums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Trending Albums</Text>
          <FlatList
            data={popularAlbums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => `album-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Top Playlists */}
      {popularPlaylists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curated Playlists</Text>
          <FlatList
            data={popularPlaylists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => `playlist-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested For You</Text>
          {suggestions.slice(0, 5).map((song, index) => (
            <SongCard
              key={`sug-${song.id}`}
              song={song}
              index={index}
              onPress={handleSuggestionPress}
              onOptions={handleOptions}
              showIndex
            />
          ))}
        </View>
      )}

      {/* Trending section header */}
      <View style={styles.trendingHeader}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.trendingTitleContainer}>
          <Text style={styles.trendingLabel}>TRENDING CHART</Text>
          <Text style={styles.trendingTitle}>Top 20 This Week</Text>
        </View>
        <LinearGradient
          colors={[colors.accentSecondary, colors.accentPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trendingBadge}
        >
          <Text style={styles.trendingBadgeText}>🔥 HOT</Text>
        </LinearGradient>
      </View>
    </View>
  );

  if (isLoading && trendingSongs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <Text style={styles.loadingText}>Loading your music...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      <FlatList
        data={trendingSongs}
        renderItem={({ item, index }) => (
          <SongCard
            song={item}
            index={index}
            onPress={handleSongPress}
            onOptions={handleOptions}
            showIndex
          />
        )}
        keyExtractor={(item, index) => `trending-${item.id}-${index}`}
        ListHeaderComponent={ListHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          currentTrack ? { paddingBottom: 140 } : { paddingBottom: 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
            progressBackgroundColor={colors.bgSurface}
          />
        }
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator
              size="small"
              color={colors.accentPrimary}
              style={{ marginVertical: spacing.xl }}
            />
          ) : null
        }
      />
    </View>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
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
    gap: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  cachedHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.lg,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: spacing.sm,
  },
  appTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  // Artist cards
  artistCard: {
    alignItems: 'center',
    width: 85,
  },
  artistImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgElevated,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
  },
  artistName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Recent cards
  recentCard: {
    width: 130,
    marginRight: spacing.xs,
  },
  recentImage: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
    marginBottom: spacing.sm,
  },
  recentTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentArtist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  // Trending badge
  // Trending header design
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  trendingTitleContainer: {
    flex: 1,
  },
  trendingLabel: {
    color: colors.accentPrimary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  trendingTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  trendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    // @ts-ignore
    boxShadow: `0 4px 12px ${colors.glowColor}`,
  },
  trendingBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
});

export default HomeScreen;
