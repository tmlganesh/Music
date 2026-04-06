import { create } from 'zustand';
import { Platform } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import storage from '../utils/storage';
import { Song } from '../api/types';
import { getDownloadUrl } from '../utils/getImageUrl';

interface DownloadInfo {
  songId: string;
  filePath: string;
  song: Song;
}

interface DownloadState {
  downloads: Record<string, DownloadInfo>;
  activeDownloads: Record<string, number>;

  isDownloaded: (songId: string) => boolean;
  getLocalPath: (songId: string) => string | null;
  downloadSong: (song: Song) => Promise<boolean>;
  removeDownload: (songId: string) => Promise<void>;
  loadDownloads: () => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: {},
  activeDownloads: {},

  isDownloaded: (songId) => !!get().downloads[songId],

  getLocalPath: (songId) => {
    const info = get().downloads[songId];
    return info?.filePath || null;
  },

  downloadSong: async (song) => {
    if (Platform.OS === 'web') return false;
    const { downloads, activeDownloads } = get();
    if (downloads[song.id] || activeDownloads[song.id] !== undefined) return false;

    let downloadUrl = getDownloadUrl(song.downloadUrl);
    if (!downloadUrl) {
      try {
        const { getSongById } = await import('../api/songs');
        const freshData = await getSongById(song.id);
        if (freshData.success && freshData.data.length > 0) {
          downloadUrl = getDownloadUrl(freshData.data[0].downloadUrl);
        }
      } catch (error) {
        console.error('Could not fetch fresh download URL:', error);
      }
    }

    if (!downloadUrl) {
      console.error('No download URL available for song:', song.id);
      return false;
    }

    set({ activeDownloads: { ...get().activeDownloads, [song.id]: 0 } });

    try {
      // Create download directory
      const songsDir = new Directory(Paths.document, 'songs');
      if (!songsDir.exists) {
        songsDir.create({ intermediates: true, idempotent: true });
      }

      // Download file
      const safeSongId = song.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const destFile = new File(songsDir, `${safeSongId}.mp4`);
      const downloadedFile = await File.downloadFileAsync(downloadUrl, destFile, {
        idempotent: true,
      });

      set({
        activeDownloads: { ...get().activeDownloads, [song.id]: 1 },
      });

      const info: DownloadInfo = {
        songId: song.id,
        filePath: downloadedFile.uri,
        song,
      };
      const newDownloads = { ...get().downloads, [song.id]: info };
      const newActive = { ...get().activeDownloads };
      delete newActive[song.id];

      set({ downloads: newDownloads, activeDownloads: newActive });
      await storage.addDownload(song.id, downloadedFile.uri);
      return true;
    } catch (error) {
      console.error('Download error:', error);
      const newActive = { ...get().activeDownloads };
      delete newActive[song.id];
      set({ activeDownloads: newActive });
      return false;
    }
  },

  removeDownload: async (songId) => {
    if (Platform.OS === 'web') return;
    const info = get().downloads[songId];
    if (info) {
      try {
        const file = new File(info.filePath);
        if (file.exists) {
          file.delete();
        }
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }
    const newDownloads = { ...get().downloads };
    delete newDownloads[songId];
    set({ downloads: newDownloads });
    await storage.removeDownload(songId);
  },

  loadDownloads: async () => {
    if (Platform.OS === 'web') return;
    const storedDownloads = await storage.getDownloads();
    const validDownloads: Record<string, DownloadInfo> = {};

    for (const [songId, filePath] of Object.entries(storedDownloads)) {
      try {
        const file = new File(filePath);
        if (file.exists) {
          validDownloads[songId] = { songId, filePath, song: {} as Song };
        } else {
          await storage.removeDownload(songId);
        }
      } catch {
        await storage.removeDownload(songId);
      }
    }

    set({ downloads: validDownloads });
  },
}));
