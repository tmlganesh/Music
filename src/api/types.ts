// API Response Types for JioSaavn API

export interface ImageQuality {
  quality: string;
  url: string;
}

export interface DownloadUrl {
  quality: string;
  url: string;
}

export interface ArtistMini {
  id: string;
  name: string;
  role: string;
  type: string;
  image: ImageQuality[];
  url: string;
}

export interface AlbumMini {
  id: string | null;
  name: string | null;
  url: string | null;
}

export interface Song {
  id: string;
  name: string;
  type: string;
  year: string | null;
  releaseDate: string | null;
  duration: number | null;
  label: string | null;
  explicitContent: boolean;
  playCount: number | null;
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
  url: string;
  copyright: string | null;
  album: AlbumMini;
  artists: {
    primary: ArtistMini[];
    featured: ArtistMini[];
    all: ArtistMini[];
  };
  image: ImageQuality[];
  downloadUrl: DownloadUrl[];
}

export interface Album {
  id: string;
  name: string;
  description: string;
  year: number | null;
  type: string;
  playCount: number | null;
  language: string;
  explicitContent: boolean;
  artists: {
    primary: ArtistMini[];
    featured: ArtistMini[];
    all: ArtistMini[];
  };
  songCount: number | null;
  url: string;
  image: ImageQuality[];
  songs: Song[] | null;
}

export interface Artist {
  id: string;
  name: string;
  url: string;
  type: string;
  image: ImageQuality[];
  followerCount: number | null;
  fanCount: string | null;
  isVerified: boolean | null;
  dominantLanguage: string | null;
  dominantType: string | null;
  bio: Array<{ text: string | null; title: string | null; sequence: number | null }> | null;
  dob: string | null;
  fb: string | null;
  twitter: string | null;
  wiki: string | null;
  availableLanguages: string[];
  isRadioPresent: boolean | null;
  topSongs: Song[] | null;
  topAlbums: Album[] | null;
  singles: Song[] | null;
  similarArtists: Array<{
    id: string;
    name: string;
    url: string;
    image: ImageQuality[];
    type: string;
  }> | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  year: number | null;
  type: string;
  playCount: number | null;
  language: string;
  explicitContent: boolean;
  songCount: number | null;
  url: string;
  image: ImageQuality[];
  songs: Song[] | null;
  artists: ArtistMini[] | null;
}

// Search response types
export interface SearchSongResult {
  id: string;
  title: string;
  image: ImageQuality[];
  album: string;
  url: string;
  type: string;
  description: string;
  primaryArtists: string;
  singers: string;
  language: string;
}

export interface SearchAlbumResult {
  id: string;
  title: string;
  image: ImageQuality[];
  artist: string;
  url: string;
  type: string;
  description: string;
  year: string;
  language: string;
  songIds: string;
}

export interface SearchArtistResult {
  id: string;
  title: string;
  image: ImageQuality[];
  type: string;
  description: string;
  position: number;
}

export interface SearchPlaylistResult {
  id: string;
  title: string;
  image: ImageQuality[];
  url: string;
  language: string;
  type: string;
  description: string;
}

export interface GlobalSearchResponse {
  success: boolean;
  data: {
    albums: { results: SearchAlbumResult[]; position: number };
    songs: { results: SearchSongResult[]; position: number };
    artists: { results: SearchArtistResult[]; position: number };
    playlists: { results: SearchPlaylistResult[]; position: number };
    topQuery: { results: SearchSongResult[]; position: number };
  };
}

export interface SongSearchResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: Song[];
  };
}

export interface AlbumSearchResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: Album[];
  };
}

export interface ArtistSearchResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: ArtistMini[];
  };
}

export interface PlaylistSearchResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: Array<{
      id: string;
      name: string;
      type: string;
      image: ImageQuality[];
      url: string;
      songCount: number | null;
      language: string;
      explicitContent: boolean;
    }>;
  };
}

export interface SongDetailResponse {
  success: boolean;
  data: Song[];
}

export interface ArtistDetailResponse {
  success: boolean;
  data: Artist;
}

export interface AlbumDetailResponse {
  success: boolean;
  data: Album;
}

export interface PlaylistDetailResponse {
  success: boolean;
  data: Playlist;
}

export interface ArtistSongsResponse {
  success: boolean;
  data: {
    total: number;
    songs: Song[];
  };
}

export interface ArtistAlbumsResponse {
  success: boolean;
  data: {
    total: number;
    albums: Album[];
  };
}
