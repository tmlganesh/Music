import apiClient from './client';
import { SongDetailResponse, SongSearchResponse } from './types';
import { normalizeSong } from './normalize';
import { isSuccessResponse } from './response';

export const searchSongs = async (
  query: string,
  page: number = 0,
  limit: number = 20
): Promise<SongSearchResponse> => {
  const { data } = await apiClient.get('/api/search/songs', {
    params: { query, page, limit },
  });

  const results = Array.isArray(data?.data?.results)
    ? data.data.results.map(normalizeSong)
    : [];

  return {
    success: isSuccessResponse(data),
    data: {
      total: Number(data?.data?.total ?? 0),
      start: Number(data?.data?.start ?? 0),
      results,
    },
  };
};

export const getSongById = async (id: string): Promise<SongDetailResponse> => {
  const { data } = await apiClient.get(`/api/songs/${id}`);

  const rawResults = Array.isArray(data?.data)
    ? data.data
    : data?.data
      ? [data.data]
      : [];

  return {
    success: isSuccessResponse(data),
    data: rawResults.map(normalizeSong),
  };
};

export const getSongsByIds = async (ids: string[]): Promise<SongDetailResponse> => {
  const { data } = await apiClient.get('/api/songs', {
    params: { ids: ids.join(',') },
  });

  const rawResults = Array.isArray(data?.data)
    ? data.data
    : data?.data
      ? [data.data]
      : [];

  return {
    success: isSuccessResponse(data),
    data: rawResults.map(normalizeSong),
  };
};

export const getSongSuggestions = async (
  id: string,
  limit: number = 10
): Promise<SongDetailResponse> => {
  const { data } = await apiClient.get(`/api/songs/${id}/suggestions`, {
    params: { limit },
  });

  const rawResults = Array.isArray(data?.data)
    ? data.data
    : data?.data
      ? [data.data]
      : [];

  return {
    success: isSuccessResponse(data),
    data: rawResults.map(normalizeSong),
  };
};
