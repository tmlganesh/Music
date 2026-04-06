import { create } from 'zustand';
import storage from '../utils/storage';

interface SearchState {
  query: string;
  history: string[];
  isSearching: boolean;

  setQuery: (query: string) => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  setIsSearching: (searching: boolean) => void;
  loadHistory: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  history: [],
  isSearching: false,

  setQuery: (query) => set({ query }),

  addToHistory: async (query) => {
    if (!query.trim()) return;
    await storage.addSearchHistory(query.trim());
    const history = await storage.getSearchHistory();
    set({ history });
  },

  clearHistory: async () => {
    await storage.clearSearchHistory();
    set({ history: [] });
  },

  setIsSearching: (searching) => set({ isSearching: searching }),

  loadHistory: async () => {
    const history = await storage.getSearchHistory();
    set({ history });
  },
}));
