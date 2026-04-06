import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import debounce from 'lodash.debounce';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { globalSearch } from '../api/search';
import { searchSongs } from '../api/songs';
import { Song, GlobalSearchResponse, ArtistMini } from '../api/types';
import SongCard from '../components/SongCard';
import audioService from '../services/audioService';
import { useSearchStore } from '../stores/searchStore';
import { usePlayerStore } from '../stores/playerStore';
import { getImageUrl } from '../utils/getImageUrl';
import { isApiCooldownActive, resetApiCooldown } from '../api/client';
import storage from '../utils/storage';
import { FALLBACK_SONGS } from '../api/fallbackSongs';
import { useSafeInsets } from '../utils/useSafeInsets';

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeInsets();
  const { query, setQuery, history, addToHistory, clearHistory, loadHistory } =
    useSearchStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const browseBottomPadding = currentTrack ? 156 : 68 + insets.bottom;
  const resultsBottomPadding = currentTrack ? 148 : 68 + insets.bottom;

  useEffect(() => {
    loadHistory();
  }, []);

  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setErrorText(null);
        return;
      }

      if (isApiCooldownActive()) {
        // API is supposed to be unlimited, so reset and try
        resetApiCooldown();
      }

      setIsSearching(true);
      setErrorText(null);
      try {
        const res = await searchSongs(searchQuery, 0, 20);
        setResults(res.data.results);
        setTotal(res.data.total);
        setPage(0);
        setHasUserScrolled(false);
        setHasSearched(true);
        addToHistory(searchQuery);
      } catch (error) {
        const recentSongs = ((await storage.getRecentlyPlayed()) as Song[]) || [];
        const localPool = [...recentSongs, ...FALLBACK_SONGS];
        const normalizedQuery = searchQuery.toLowerCase().trim();
        const localMatches = localPool
          .filter((song) => {
            const haystack = [
              song.name,
              song.album?.name || '',
              song.artists?.primary?.map((artist) => artist.name).join(' ') || '',
            ]
              .join(' ')
              .toLowerCase();
            return haystack.includes(normalizedQuery);
          })
          .filter((song, index, self) => self.findIndex((s) => s.id === song.id) === index)
          .slice(0, 20);

        if (localMatches.length > 0) {
          setResults(localMatches);
          setTotal(localMatches.length);
          setPage(0);
          setHasSearched(true);
          setHasUserScrolled(false);
          setErrorText('Live search is limited right now. Showing local results.');
        } else {
          setResults([]);
          setTotal(0);
          setErrorText('Search is temporarily unavailable. Please retry shortly.');
        }
      } finally {
        setIsSearching(false);
      }
    }, 400),
    []
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    performSearch(text);
  };

  const handleArtistPress = (artist: ArtistMini) => {
    navigation.navigate('Artist' as any, { artistId: artist.id, artistName: artist.name });
  };

  const handleHistoryTap = (historyQuery: string) => {
    setQuery(historyQuery);
    performSearch(historyQuery);
    Keyboard.dismiss();
  };

  const loadMore = async () => {
    if (!hasUserScrolled || isSearching || isLoadingMore || results.length >= total || isApiCooldownActive()) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await searchSongs(query, nextPage, 20);
      setResults((prev) => [...prev, ...res.data.results]);
      setPage(nextPage);
    } catch {
      setErrorText('Could not load more results right now.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSongPress = async (song: Song) => {
    await audioService.play(
      song,
      results,
      results.findIndex((s) => s.id === song.id)
    );
  };

  const handleListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasUserScrolled) return;
    if (event.nativeEvent.contentOffset.y > 24) {
      setHasUserScrolled(true);
    }
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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      {/* Search header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
              stroke={colors.textSecondary}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, artists, albums..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.textSecondary}>
                <Path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Browse mode */}
      {!hasSearched && !isSearching && query.length === 0 && (
        <ScrollView
          style={styles.browseScroll}
          contentContainerStyle={[styles.browseContent, { paddingBottom: browseBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyChips}>
                {history.slice(0, 10).map((item, index) => (
                  <TouchableOpacity
                    key={`hist-${index}`}
                    style={styles.chip}
                    onPress={() => handleHistoryTap(item)}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View
            style={[
              styles.categoriesSection,
              history.length === 0 ? styles.categoriesSectionFirst : undefined,
            ]}
          >
            <Text style={styles.categoriesTitle}>Browse Categories</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.categoryCard, { backgroundColor: cat.color }]}
                  onPress={() => handleHistoryTap(cat.query)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Loading */}
      {isSearching && results.length === 0 && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      )}

      {/* No results */}
      {hasSearched && results.length === 0 && !isSearching && (
        <View style={styles.centerContainer}>
          <Text style={styles.noResults}>{errorText ? 'Search Temporarily Unavailable' : 'No songs found'}</Text>
          <Text style={styles.noResultsSub}>
            {errorText || 'Try a different search term'}
          </Text>
        </View>
      )}

      {/* Results */}
      {results.length > 0 && (
        <FlatList
          data={results}
          renderItem={({ item, index }) => (
            <SongCard
              song={item}
              index={index}
              onPress={handleSongPress}
              onOptions={handleOptions}
            />
          )}
          keyExtractor={(item, index) => `search-${item.id}-${index}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.resultsList, { paddingBottom: resultsBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {total.toLocaleString()} results
            </Text>
          }
        />
      )}
    </View>
  );
};

const CATEGORIES = [
  { name: 'Bollywood', query: 'bollywood hits', emoji: '🎬', color: '#7C3AED' },
  { name: 'Hindi Romantic', query: 'hindi romantic songs', emoji: '❤️', color: '#DC2626' },
  { name: 'Punjabi', query: 'punjabi hits', emoji: '🎶', color: '#D97706' },
  { name: 'Arijit Singh', query: 'arijit singh', emoji: '🎤', color: '#2563EB' },
  { name: 'Devotional', query: 'devotional songs hindi', emoji: '🕉️', color: '#BE185D' },
  { name: 'Chill Hindi', query: 'hindi lofi chill', emoji: '☕', color: '#059669' },
  { name: 'Party', query: 'hindi party songs', emoji: '🎧', color: '#4F46E5' },
  { name: 'Retro Hindi', query: 'old hindi songs classic', emoji: '🌍', color: '#0891B2' },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  historySection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  browseScroll: {
    flex: 1,
  },
  browseContent: {
    paddingBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  clearText: {
    color: colors.accentPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  categoriesSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  categoriesSectionFirst: {
    marginTop: spacing.lg,
  },
  categoriesTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '47%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  categoryName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  noResultsSub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  resultsCount: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  resultsList: {
    paddingBottom: 20,
  },
  inlineErrorWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  inlineErrorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
});

export default SearchScreen;
