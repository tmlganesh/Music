import { create } from 'zustand';
import { Song } from '../api/types';
import storage from '../utils/storage';

export type RepeatMode = 'off' | 'one' | 'all';

interface PlayerState {
  // Current track
  currentTrack: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // ms
  duration: number; // ms
  isBuffering: boolean;

  // Queue
  queue: Song[];
  queueIndex: number;
  originalQueue: Song[]; // For un-shuffling

  // Modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  currentRoute: string;

  // Actions
  setCurrentTrack: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  setIsBuffering: (buffering: boolean) => void;
  setCurrentRoute: (route: string) => void;

  // Playback actions (high-level, used by audioService)
  playTrack: (song: Song, queue?: Song[], index?: number) => void;
  playNext: () => Song | null;
  playPrevious: () => Song | null;

  // Queue management
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Persistence
  persistQueue: () => void;
  rehydrate: () => Promise<void>;
}

// Fisher-Yates shuffle preserving current track at front
const shuffleArray = <T>(arr: T[], currentIndex: number): T[] => {
  const result = [...arr];
  const current = result.splice(currentIndex, 1)[0];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [current, ...result];
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  isBuffering: false,
  queue: [],
  queueIndex: 0,
  originalQueue: [],
  shuffleMode: false,
  repeatMode: 'off',
  currentRoute: 'Home',

  // Setters
  setCurrentTrack: (song) => set({ currentTrack: song }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setPosition: (ms) => set({ position: ms }),
  setDuration: (ms) => set({ duration: ms }),
  setIsBuffering: (buffering) => set({ isBuffering: buffering }),
  setCurrentRoute: (route) => set({ currentRoute: route }),

  // Play a specific track
  playTrack: (song, queue, index) => {
    const state = get();
    let newQueue = queue || state.queue;
    let newIndex = index ?? 0;

    if (!queue && !state.queue.find((s) => s.id === song.id)) {
      // Song not in queue, add to beginning
      newQueue = [song, ...state.queue];
      newIndex = 0;
    } else if (queue) {
      newIndex = index ?? queue.findIndex((s) => s.id === song.id);
      if (newIndex < 0) newIndex = 0;
    } else {
      newIndex = state.queue.findIndex((s) => s.id === song.id);
      if (newIndex < 0) newIndex = 0;
    }

    set({
      currentTrack: song,
      queue: newQueue,
      queueIndex: newIndex,
      originalQueue: newQueue,
      position: 0,
      duration: (song.duration || 0) * 1000,
      isLoading: true,
    });

    // Persist
    get().persistQueue();

    // Add to recently played
    storage.addRecentlyPlayed(song);
  },

  // Get next track
  playNext: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return null;

    let nextIndex: number;

    if (repeatMode === 'one') {
      nextIndex = queueIndex; // Replay same
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0; // Wrap around
    } else {
      return null; // End of queue
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        position: 0,
        duration: (nextTrack.duration || 0) * 1000,
        isLoading: true,
      });
      get().persistQueue();
      storage.addRecentlyPlayed(nextTrack);
    }
    return nextTrack;
  },

  // Get previous track
  playPrevious: () => {
    const { queue, queueIndex, position } = get();
    if (queue.length === 0) return null;

    // If more than 3 seconds in, restart current track
    if (position > 3000) {
      set({ position: 0 });
      return get().currentTrack;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        position: 0,
        duration: (prevTrack.duration || 0) * 1000,
        isLoading: true,
      });
      get().persistQueue();
      storage.addRecentlyPlayed(prevTrack);
    }
    return prevTrack;
  },

  // Queue management
  setQueue: (songs, startIndex = 0) => {
    set({
      queue: songs,
      originalQueue: songs,
      queueIndex: startIndex,
    });
    get().persistQueue();
  },

  addToQueue: (song) => {
    const { queue } = get();
    if (queue.find((s) => s.id === song.id)) return; // Already in queue
    set({ queue: [...queue, song], originalQueue: [...get().originalQueue, song] });
    get().persistQueue();
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    if (index < 0 || index >= queue.length) return;

    const newQueue = [...queue];
    newQueue.splice(index, 1);

    let newIndex = queueIndex;
    if (index < queueIndex) newIndex--;
    if (newIndex >= newQueue.length) newIndex = Math.max(0, newQueue.length - 1);

    set({ queue: newQueue, queueIndex: newIndex });
    get().persistQueue();
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, queueIndex } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);

    let newIndex = queueIndex;
    if (fromIndex === queueIndex) {
      newIndex = toIndex;
    } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
      newIndex--;
    } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
      newIndex++;
    }

    set({ queue: newQueue, queueIndex: newIndex });
    get().persistQueue();
  },

  clearQueue: () => {
    set({ queue: [], originalQueue: [], queueIndex: 0, currentTrack: null, isPlaying: false });
    get().persistQueue();
  },

  // Toggle shuffle
  toggleShuffle: () => {
    const { shuffleMode, queue, queueIndex, originalQueue } = get();
    if (shuffleMode) {
      // Turn off shuffle - restore original order
      const currentTrack = queue[queueIndex];
      const newIndex = originalQueue.findIndex((s) => s.id === currentTrack?.id);
      set({ shuffleMode: false, queue: [...originalQueue], queueIndex: newIndex >= 0 ? newIndex : 0 });
    } else {
      // Turn on shuffle
      const shuffled = shuffleArray(queue, queueIndex);
      set({ shuffleMode: true, queue: shuffled, queueIndex: 0 });
    }
    get().persistQueue();
  },

  // Toggle repeat
  toggleRepeat: () => {
    const { repeatMode } = get();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    set({ repeatMode: modes[(currentIndex + 1) % modes.length] });
  },

  // Persist queue to storage
  persistQueue: () => {
    const { queue, queueIndex } = get();
    storage.setQueue(queue);
    storage.setQueueIndex(queueIndex);
  },

  // Rehydrate from storage
  rehydrate: async () => {
    const queue = (await storage.getQueue()) as Song[];
    const queueIndex = (await storage.getQueueIndex()) as number;
    if (queue && queue.length > 0) {
      const idx = Math.min(queueIndex || 0, queue.length - 1);
      set({
        queue,
        originalQueue: queue,
        queueIndex: idx,
        currentTrack: queue[idx] || null,
        isPlaying: false,
      });
    }
  },
}));
