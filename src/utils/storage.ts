import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  QUEUE: '@loko_queue',
  QUEUE_INDEX: '@loko_queue_index',
  SEARCH_HISTORY: '@loko_search_history',
  RECENTLY_PLAYED: '@loko_recently_played',
  DOWNLOADS: '@loko_downloads',
  FAVORITES: '@loko_favorites',
} as const;

export const storage = {
  // Generic
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Storage get error [${key}]:`, error);
      return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Storage set error [${key}]:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Storage remove error [${key}]:`, error);
    }
  },

  // Queue
  async getQueue() {
    return this.get<any[]>(KEYS.QUEUE) || [];
  },
  async setQueue(queue: any[]) {
    return this.set(KEYS.QUEUE, queue);
  },
  async getQueueIndex() {
    return this.get<number>(KEYS.QUEUE_INDEX) ?? 0;
  },
  async setQueueIndex(index: number) {
    return this.set(KEYS.QUEUE_INDEX, index);
  },

  // Search history
  async getSearchHistory(): Promise<string[]> {
    return (await this.get<string[]>(KEYS.SEARCH_HISTORY)) || [];
  },
  async addSearchHistory(query: string) {
    const history = await this.getSearchHistory();
    const filtered = history.filter((h) => h !== query);
    const updated = [query, ...filtered].slice(0, 20);
    return this.set(KEYS.SEARCH_HISTORY, updated);
  },
  async clearSearchHistory() {
    return this.remove(KEYS.SEARCH_HISTORY);
  },

  // Recently played
  async getRecentlyPlayed() {
    return (await this.get<any[]>(KEYS.RECENTLY_PLAYED)) || [];
  },
  async addRecentlyPlayed(song: any) {
    const recent = await this.getRecentlyPlayed();
    const filtered = recent.filter((s) => s.id !== song.id);
    const updated = [song, ...filtered].slice(0, 30);
    return this.set(KEYS.RECENTLY_PLAYED, updated);
  },

  // Downloads
  async getDownloads() {
    return (await this.get<Record<string, string>>(KEYS.DOWNLOADS)) || {};
  },
  async addDownload(songId: string, filePath: string) {
    const downloads = await this.getDownloads();
    downloads[songId] = filePath;
    return this.set(KEYS.DOWNLOADS, downloads);
  },
  async removeDownload(songId: string) {
    const downloads = await this.getDownloads();
    delete downloads[songId];
    return this.set(KEYS.DOWNLOADS, downloads);
  },

  // Favorites
  async getFavorites(): Promise<string[]> {
    return (await this.get<string[]>(KEYS.FAVORITES)) || [];
  },
  async toggleFavorite(songId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    const index = favorites.indexOf(songId);
    if (index >= 0) {
      favorites.splice(index, 1);
      await this.set(KEYS.FAVORITES, favorites);
      return false;
    } else {
      favorites.push(songId);
      await this.set(KEYS.FAVORITES, favorites);
      return true;
    }
  },
};

export default storage;
