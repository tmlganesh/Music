import { Song, Artist } from '../api/types';

export type RootStackParamList = {
  MainTabs: undefined;
  Player: undefined;
  Artist: { artistId: string; artistName?: string };
  Album: { albumId: string; albumName?: string };
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  Artist: { artistId: string; artistName?: string };
  Album: { albumId: string; albumName?: string };
  Playlist: { playlistId: string; playlistName?: string };
};

export type SearchStackParamList = {
  SearchScreen: undefined;
  Artist: { artistId: string; artistName?: string };
  Album: { albumId: string; albumName?: string };
  Playlist: { playlistId: string; playlistName?: string };
};

export type TabParamList = {
  HomeStack: undefined;
  SearchStack: undefined;
  Queue: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
