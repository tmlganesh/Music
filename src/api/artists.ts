import apiClient from './client';
import { ArtistDetailResponse, ArtistSongsResponse, ArtistAlbumsResponse } from './types';
import { normalizeAlbum, normalizeArtist, normalizeSong } from './normalize';
import { isSuccessResponse } from './response';

export const getArtistById = async (
  id: string,
  songCount: number = 10,
  albumCount: number = 10
): Promise<ArtistDetailResponse> => {
  const { data } = await apiClient.get(`/api/artists/${id}`, {
    params: { songCount, albumCount, sortBy: 'popularity', sortOrder: 'desc' },
  });
  return {
    success: isSuccessResponse(data),
    data: normalizeArtist(data?.data ?? {}),
  };
};

export const getArtistSongs = async (
  id: string,
  page: number = 0,
  sortBy: 'popularity' | 'latest' | 'alphabetical' = 'popularity',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ArtistSongsResponse> => {
  const { data } = await apiClient.get(`/api/artists/${id}/songs`, {
    params: { page, sortBy, sortOrder },
  });
  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      songs: Array.isArray(data?.data?.songs) ? data.data.songs.map(normalizeSong) : [],
    },
  };
};

export const getArtistAlbums = async (
  id: string,
  page: number = 0,
  sortBy: 'popularity' | 'latest' | 'alphabetical' = 'popularity',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ArtistAlbumsResponse> => {
  const { data } = await apiClient.get(`/api/artists/${id}/albums`, {
    params: { page, sortBy, sortOrder },
  });
  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      albums: Array.isArray(data?.data?.albums) ? data.data.albums.map(normalizeAlbum) : [],
    },
  };
};
