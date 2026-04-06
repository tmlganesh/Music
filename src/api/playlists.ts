import apiClient from './client';
import { PlaylistDetailResponse } from './types';
import { normalizePlaylist } from './normalize';
import { isSuccessResponse } from './response';

export const getPlaylistById = async (id: string): Promise<PlaylistDetailResponse> => {
  try {
    const { data } = await apiClient.get(`/api/playlists/${id}`);
    return {
      success: isSuccessResponse(data),
      data: normalizePlaylist(data?.data ?? {}),
    };
  } catch {
    const { data } = await apiClient.get('/api/playlists', {
      params: { id },
    });
    return {
      success: isSuccessResponse(data),
      data: normalizePlaylist(data?.data ?? {}),
    };
  }
};
