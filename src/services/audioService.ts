import { Platform } from 'react-native';
import { usePlayerStore } from '../stores/playerStore';
import { useDownloadStore } from '../stores/downloadStore';
import { Song } from '../api/types';

/**
 * Unified audio service that works on both native (expo-audio) and web (HTML5 Audio).
 * The play button issues on web were caused by expo-audio's createAudioPlayer not
 * working correctly in web environments. This service uses the HTML5 Audio API 
 * for web and expo-audio for native platforms.
 */
class AudioService {
  private nativePlayer: any = null;
  private webAudio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private statusInterval: any = null;
  private isWeb = Platform.OS === 'web';

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (!this.isWeb) {
        // Native: configure audio mode
        const { setAudioModeAsync } = await import('expo-audio');
        await setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground: true,
          playsInSilentMode: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'doNotMix',
          interruptionModeAndroid: 1 as any,
        });
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      // Still mark as initialized on web to avoid blocking
      if (this.isWeb) this.isInitialized = true;
    }
  }

  private startStatusPolling() {
    this.stopStatusPolling();
    this.statusInterval = setInterval(() => {
      const store = usePlayerStore.getState();
      
      if (this.isWeb && this.webAudio) {
        const currentTimeMs = (this.webAudio.currentTime || 0) * 1000;
        const durationMs = (this.webAudio.duration || 0) * 1000;
        store.setPosition(currentTimeMs);
        if (durationMs > 0 && !isNaN(durationMs)) {
          store.setDuration(durationMs);
        }
        store.setIsPlaying(!this.webAudio.paused && !this.webAudio.ended);
        store.setIsBuffering(this.webAudio.readyState < 3);
      } else if (this.nativePlayer) {
        const currentTimeMs = Number(this.nativePlayer.currentTime || 0) * 1000;
        const durationMs = Number(this.nativePlayer.duration || 0) * 1000;
        store.setPosition(currentTimeMs);
        if (durationMs > 0 && !isNaN(durationMs)) {
          store.setDuration(durationMs);
        }
        store.setIsPlaying(Boolean(this.nativePlayer.playing));
        store.setIsBuffering(Boolean(this.nativePlayer.isBuffering));
      }
    }, 250);
  }

  private stopStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private handleTrackEnd() {
    const store = usePlayerStore.getState();
    this.stopStatusPolling();

    if (store.repeatMode === 'one') {
      this.seekTo(0);
      this.resume();
      return;
    }

    const nextTrack = store.playNext();
    if (nextTrack) {
      this.loadAndPlay(nextTrack);
    } else {
      store.setIsPlaying(false);
      store.setPosition(0);
    }
  }

  private releaseCurrentPlayer() {
    this.stopStatusPolling();
    
    if (this.isWeb && this.webAudio) {
      this.webAudio.pause();
      this.webAudio.removeAttribute('src');
      this.webAudio.load();
      this.webAudio = null;
    }
    
    if (this.nativePlayer) {
      try {
        if (typeof this.nativePlayer.pause === 'function') {
          this.nativePlayer.pause();
        }
        if (typeof this.nativePlayer.remove === 'function') {
          this.nativePlayer.remove();
        }
      } catch (e) {
        // Ignore release errors
      }
      this.nativePlayer = null;
    }
  }

  private getPreferredStreamUrls(urls: Array<{ quality: string; url: string }> | undefined): string[] {
    if (!urls || urls.length === 0) return [];

    const preferredQualities = ['160kbps', '96kbps', '320kbps', '48kbps', '12kbps'];
    const picked: string[] = [];

    for (const quality of preferredQualities) {
      const match = urls.find((entry) => entry.quality === quality && entry.url?.startsWith('http'));
      if (match?.url && !picked.includes(match.url)) {
        picked.push(match.url);
      }
    }

    for (const entry of urls) {
      if (entry?.url?.startsWith('http') && !picked.includes(entry.url)) {
        picked.push(entry.url);
      }
    }

    return picked;
  }

  private async resolveSongStreamCandidates(
    song: Song
  ): Promise<{ candidates: string[]; refreshedSong: Song | null }> {
    const directCandidates = this.getPreferredStreamUrls(song.downloadUrl);
    if (directCandidates.length > 0) {
      return { candidates: directCandidates, refreshedSong: null };
    }

    // Fallback 1: fetch by song id for fresh metadata/download URLs
    try {
      const { getSongById } = await import('../api/songs');
      const freshById = await getSongById(song.id);
      if (freshById.success && freshById.data.length > 0) {
        const refreshed = freshById.data[0];
        const byIdCandidates = this.getPreferredStreamUrls(refreshed.downloadUrl);
        if (byIdCandidates.length > 0) {
          return { candidates: byIdCandidates, refreshedSong: refreshed };
        }
      }
    } catch (error) {
      console.log('Song metadata refresh by id failed:', error);
    }

    // Fallback 2: search by name and take the closest candidate
    try {
      const { searchSongs } = await import('../api/songs');
      const searchResult = await searchSongs(song.name, 0, 10);
      const byIdMatch = searchResult.data.results.find((candidate) => candidate.id === song.id);
      const byNameMatch = searchResult.data.results.find(
        (candidate) => candidate.name.toLowerCase().trim() === song.name.toLowerCase().trim()
      );
      const fallbackMatch = byIdMatch || byNameMatch || searchResult.data.results[0];

      if (fallbackMatch) {
        const byNameCandidates = this.getPreferredStreamUrls(fallbackMatch.downloadUrl);
        if (byNameCandidates.length > 0) {
          return { candidates: byNameCandidates, refreshedSong: fallbackMatch };
        }
      }
    } catch (error) {
      console.log('Song metadata refresh by search failed:', error);
    }

    return { candidates: [], refreshedSong: null };
  }

  async loadAndPlay(song: Song) {
    const store = usePlayerStore.getState();
    const downloadStore = useDownloadStore.getState();

    try {
      await this.initialize();

      // Release previous player
      this.releaseCurrentPlayer();

      store.setIsLoading(true);
      store.setIsBuffering(true);

      // Check for offline download first
      let localUri: string | null = null;
      if (downloadStore.isDownloaded(song.id)) {
        localUri = downloadStore.getLocalPath(song.id);
      }

      const streamResolution = await this.resolveSongStreamCandidates(song);
      const uriCandidates = [
        ...(localUri ? [localUri] : []),
        ...streamResolution.candidates,
      ].filter((value, index, self) => Boolean(value) && self.indexOf(value) === index);

      if (streamResolution.refreshedSong) {
        store.setCurrentTrack({
          ...song,
          image: streamResolution.refreshedSong.image?.length
            ? streamResolution.refreshedSong.image
            : song.image,
          downloadUrl: streamResolution.refreshedSong.downloadUrl?.length
            ? streamResolution.refreshedSong.downloadUrl
            : song.downloadUrl,
        });
      }

      if (uriCandidates.length === 0) {
        console.error('No playable URL for song:', song.id, song.name);
        store.setIsLoading(false);
        store.setIsBuffering(false);
        // Try next track
        const nextTrack = store.playNext();
        if (nextTrack) {
          setTimeout(() => this.loadAndPlay(nextTrack), 500);
        }
        return;
      }

      let lastError: unknown = null;
      for (const uri of uriCandidates) {
        try {
          console.log(`Loading song: ${song.name} (${song.language}) - URL: ${uri.substring(0, 80)}...`);
          if (this.isWeb) {
            await this.loadAndPlayWeb(uri, song, store);
          } else {
            await this.loadAndPlayNative(uri, store);
          }
          return;
        } catch (streamError) {
          lastError = streamError;
          console.warn('Stream candidate failed, trying next one...');
          this.releaseCurrentPlayer();
        }
      }

      throw lastError ?? new Error('All stream candidates failed');

    } catch (error) {
      console.error('Error loading audio:', error);
      store.setIsLoading(false);
      store.setIsBuffering(false);
      store.setIsPlaying(false);
    }
  }

  private async loadAndPlayWeb(uri: string, song: Song, store: ReturnType<typeof usePlayerStore.getState>) {
    this.webAudio = new Audio();
    this.webAudio.crossOrigin = 'anonymous';
    this.webAudio.preload = 'auto';
    
    // Set up event handlers
    this.webAudio.oncanplay = () => {
      store.setIsLoading(false);
      store.setIsBuffering(false);
      const durationMs = (this.webAudio?.duration || 0) * 1000;
      if (durationMs > 0 && !isNaN(durationMs)) {
        store.setDuration(durationMs);
      }
    };

    this.webAudio.onplay = () => {
      store.setIsPlaying(true);
      this.startStatusPolling();
    };

    this.webAudio.onpause = () => {
      store.setIsPlaying(false);
    };

    this.webAudio.onended = () => {
      this.handleTrackEnd();
    };

    this.webAudio.onerror = (e) => {
      console.error('Web audio error:', e);
      store.setIsLoading(false);
      store.setIsBuffering(false);
      store.setIsPlaying(false);
      // Try next track on error
      const nextTrack = store.playNext();
      if (nextTrack) {
        setTimeout(() => this.loadAndPlay(nextTrack), 500);
      }
    };

    this.webAudio.onwaiting = () => {
      store.setIsBuffering(true);
    };

    this.webAudio.onplaying = () => {
      store.setIsBuffering(false);
      store.setIsPlaying(true);
    };

    this.webAudio.ondurationchange = () => {
      const durationMs = (this.webAudio?.duration || 0) * 1000;
      if (durationMs > 0 && !isNaN(durationMs)) {
        store.setDuration(durationMs);
      }
    };

    // Set source and start loading
    this.webAudio.src = uri;
    this.webAudio.load();

    // Mobile browsers can block delayed autoplay; try starting immediately.
    try {
      await this.webAudio.play();
      store.setIsLoading(false);
      store.setIsBuffering(false);
      store.setIsPlaying(true);
      this.startStatusPolling();
    } catch (err) {
      console.warn('Initial web play attempt failed. Waiting for user interaction.', err);
      store.setIsLoading(false);
      store.setIsBuffering(false);
      store.setIsPlaying(false);
    }
  }

  private async loadAndPlayNative(uri: string, store: ReturnType<typeof usePlayerStore.getState>) {
    const { createAudioPlayer } = await import('expo-audio');

    this.nativePlayer = createAudioPlayer(uri, { updateInterval: 250 });

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Native playback start timeout'));
      }, 8000);

      (this.nativePlayer as any).addListener('playbackStatusUpdate', (status: any) => {
        const currentTimeMs = Number(status?.currentTime ?? this.nativePlayer?.currentTime ?? 0) * 1000;
        const durationMs = Number(status?.duration ?? this.nativePlayer?.duration ?? 0) * 1000;

        store.setPosition(currentTimeMs);
        if (durationMs > 0 && !isNaN(durationMs)) {
          store.setDuration(durationMs);
        }

        const isPlaying = Boolean(status?.playing ?? this.nativePlayer?.playing);
        const isBuffering = Boolean(status?.isBuffering ?? this.nativePlayer?.isBuffering);
        store.setIsPlaying(isPlaying);
        store.setIsBuffering(isBuffering);
        store.setIsLoading(false);

        if (status?.error && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(String(status.error)));
          return;
        }

        if (!settled && (isPlaying || durationMs > 0)) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }

        if (status?.didJustFinish) {
          this.handleTrackEnd();
        }
      });

      try {
        this.nativePlayer.play();
      } catch (playError) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(playError);
        }
      }
    });

    this.startStatusPolling();
  }

  async play(song: Song, queue?: Song[], index?: number) {
    const store = usePlayerStore.getState();
    store.playTrack(song, queue, index);
    await this.loadAndPlay(song);
  }

  async pause() {
    if (this.isWeb && this.webAudio) {
      this.webAudio.pause();
    } else if (this.nativePlayer) {
      this.nativePlayer.pause();
    }
    usePlayerStore.getState().setIsPlaying(false);
  }

  async resume() {
    await this.initialize();
    const store = usePlayerStore.getState();
    
    if (this.isWeb && this.webAudio) {
      try {
        await this.webAudio.play();
        store.setIsPlaying(true);
        this.startStatusPolling();
      } catch (err) {
        console.error('Resume failed:', err);
        // If there's no current audio loaded, try loading the current track
        if (store.currentTrack) {
          await this.loadAndPlay(store.currentTrack);
        }
      }
    } else if (this.nativePlayer) {
      this.nativePlayer.play();
    } else if (store.currentTrack) {
      // No player exists, reload current track
      await this.loadAndPlay(store.currentTrack);
    }
  }

  async togglePlayPause() {
    const store = usePlayerStore.getState();
    
    // If no audio loaded but we have a track, load and play it
    if (!this.webAudio && !this.nativePlayer && store.currentTrack) {
      await this.loadAndPlay(store.currentTrack);
      return;
    }
    
    if (store.isPlaying) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  async seekTo(positionMs: number) {
    if (this.isWeb && this.webAudio) {
      this.webAudio.currentTime = positionMs / 1000;
      usePlayerStore.getState().setPosition(positionMs);
    } else if (this.nativePlayer) {
      await this.nativePlayer.seekTo(positionMs / 1000);
      usePlayerStore.getState().setPosition(positionMs);
    }
  }

  async playNext() {
    const store = usePlayerStore.getState();
    const nextTrack = store.playNext();
    if (nextTrack) {
      await this.loadAndPlay(nextTrack);
    }
  }

  async playPrevious() {
    const store = usePlayerStore.getState();
    const prevTrack = store.playPrevious();
    if (prevTrack) {
      if (store.position > 3000) {
        // Restart current track
        await this.seekTo(0);
        if (!store.isPlaying) {
          await this.resume();
        }
      } else {
        await this.loadAndPlay(prevTrack);
      }
    }
  }

  async stop() {
    this.releaseCurrentPlayer();
    const store = usePlayerStore.getState();
    store.setIsPlaying(false);
    store.setPosition(0);
  }

  getPlayer() {
    return this.isWeb ? this.webAudio : this.nativePlayer;
  }

  isAudioLoaded(): boolean {
    if (this.isWeb) return this.webAudio !== null;
    return this.nativePlayer !== null;
  }
}

// Singleton
export const audioService = new AudioService();
export default audioService;
