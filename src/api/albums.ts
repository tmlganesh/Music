import axios from 'axios';
import apiClient from './client';
import { AlbumDetailResponse } from './types';
import { normalizeAlbum } from './normalize';
import { isSuccessResponse } from './response';

export const getAlbumById = async (id: string): Promise<AlbumDetailResponse> => {
  try {
    // Current API expects album id as a query parameter.
    const { data } = await apiClient.get('/api/albums', {
      params: { id },
    });

    return {
      success: isSuccessResponse(data),
      data: normalizeAlbum(data?.data ?? {}),
    };
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }

    // Backward-compatible fallback for deployments still serving path-based routes.
    const { data } = await apiClient.get(`/api/albums/${id}`);
    return {
      success: isSuccessResponse(data),
      data: normalizeAlbum(data?.data ?? {}),
    };
  }
};

export const getAlbumByLink = async (link: string): Promise<AlbumDetailResponse> => {
  const { data } = await apiClient.get('/api/albums', {
    params: { link },
  });
  return {
    success: isSuccessResponse(data),
    data: normalizeAlbum(data?.data ?? {}),
  };
};
