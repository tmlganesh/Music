import apiClient from './client';
import {
  GlobalSearchResponse,
  AlbumSearchResponse,
  ArtistSearchResponse,
  PlaylistSearchResponse,
} from './types';
import { normalizeAlbum, normalizeArtistMini, normalizePlaylist } from './normalize';
import { isSuccessResponse } from './response';

export const globalSearch = async (query: string): Promise<GlobalSearchResponse> => {
  const { data } = await apiClient.get('/api/search', {
    params: { query },
  });

  return {
    success: isSuccessResponse(data),
    data: {
      albums: {
        results: Array.isArray(data?.data?.albums?.results) ? data.data.albums.results : [],
        position: Number(data?.data?.albums?.position ?? 0),
      },
      songs: {
        results: Array.isArray(data?.data?.songs?.results) ? data.data.songs.results : [],
        position: Number(data?.data?.songs?.position ?? 0),
      },
      artists: {
        results: Array.isArray(data?.data?.artists?.results) ? data.data.artists.results : [],
        position: Number(data?.data?.artists?.position ?? 0),
      },
      playlists: {
        results: Array.isArray(data?.data?.playlists?.results)
          ? data.data.playlists.results
          : [],
        position: Number(data?.data?.playlists?.position ?? 0),
      },
      topQuery: {
        results: Array.isArray(data?.data?.topQuery?.results) ? data.data.topQuery.results : [],
        position: Number(data?.data?.topQuery?.position ?? 0),
      },
    },
  };
};

export const searchAlbums = async (
  query: string,
  page: number = 0,
  limit: number = 10
): Promise<AlbumSearchResponse> => {
  const { data } = await apiClient.get('/api/search/albums', {
    params: { query, page, limit },
  });
  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      start: Number(data?.data?.start ?? 0),
      results: Array.isArray(data?.data?.results) ? data.data.results.map(normalizeAlbum) : [],
    },
  };
};

export const searchArtists = async (
  query: string,
  page: number = 0,
  limit: number = 10
): Promise<ArtistSearchResponse> => {
  const { data } = await apiClient.get('/api/search/artists', {
    params: { query, page, limit },
  });
  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      start: Number(data?.data?.start ?? 0),
      results: Array.isArray(data?.data?.results) ? data.data.results.map(normalizeArtistMini) : [],
    },
  };
};

export const searchPlaylists = async (
  query: string,
  page: number = 0,
  limit: number = 10
): Promise<PlaylistSearchResponse> => {
  const { data } = await apiClient.get('/api/search/playlists', {
    params: { query, page, limit },
  });
  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      start: Number(data?.data?.start ?? 0),
      results: Array.isArray(data?.data?.results) ? data.data.results.map((item: any) => ({
        ...normalizePlaylist(item),
        songs: null,
        artists: null,
      })) : [],
    },
  };
};
