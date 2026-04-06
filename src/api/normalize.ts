import { Album, Artist, ArtistMini, DownloadUrl, ImageQuality, Playlist, Song } from './types';

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return String(value);
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
      return false;
    }
  }
  return fallback;
};

const toNullableBoolean = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null;
  return toBoolean(value);
};

export const normalizeImages = (images: any[] | undefined): ImageQuality[] => {
  if (!Array.isArray(images)) return [];
  return images.map((img) => ({
    quality: String(img?.quality ?? ''),
    url: String(img?.url ?? img?.link ?? ''),
  }));
};

export const normalizeDownloadUrls = (urls: any[] | undefined): DownloadUrl[] => {
  if (!Array.isArray(urls)) return [];
  return urls.map((entry) => ({
    quality: String(entry?.quality ?? ''),
    url: String(entry?.url ?? entry?.link ?? ''),
  }));
};

const splitArtists = (names: string | undefined): ArtistMini[] => {
  if (!names) return [];
  return names
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `artist-${name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      name,
      role: 'Singer',
      type: 'artist',
      image: [],
      url: '',
    }));
};

export const normalizeSong = (raw: any): Song => {
  const primaryFromObject = raw?.artists?.primary;
  const primaryArtists = Array.isArray(primaryFromObject)
    ? primaryFromObject.map((a: any) => ({
        id: String(a?.id ?? ''),
        name: String(a?.name ?? 'Unknown Artist'),
        role: String(a?.role ?? ''),
        type: String(a?.type ?? 'artist'),
        image: normalizeImages(a?.image),
        url: String(a?.url ?? ''),
      }))
    : splitArtists(raw?.primaryArtists);

  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? raw?.title ?? 'Unknown Song'),
    type: String(raw?.type ?? 'song'),
    year: toStringOrNull(raw?.year),
    releaseDate: toStringOrNull(raw?.releaseDate),
    duration: toNumberOrNull(raw?.duration),
    label: toStringOrNull(raw?.label),
    explicitContent: toBoolean(raw?.explicitContent),
    playCount: toNumberOrNull(raw?.playCount),
    language: String(raw?.language ?? 'unknown'),
    hasLyrics: toBoolean(raw?.hasLyrics),
    lyricsId: toStringOrNull(raw?.lyricsId),
    url: String(raw?.url ?? ''),
    copyright: toStringOrNull(raw?.copyright),
    album: {
      id: toStringOrNull(raw?.album?.id),
      name: toStringOrNull(raw?.album?.name),
      url: toStringOrNull(raw?.album?.url),
    },
    artists: {
      primary: primaryArtists,
      featured: Array.isArray(raw?.artists?.featured)
        ? raw.artists.featured.map((a: any) => ({
            id: String(a?.id ?? ''),
            name: String(a?.name ?? 'Unknown Artist'),
            role: String(a?.role ?? ''),
            type: String(a?.type ?? 'artist'),
            image: normalizeImages(a?.image),
            url: String(a?.url ?? ''),
          }))
        : [],
      all: Array.isArray(raw?.artists?.all)
        ? raw.artists.all.map((a: any) => ({
            id: String(a?.id ?? ''),
            name: String(a?.name ?? 'Unknown Artist'),
            role: String(a?.role ?? ''),
            type: String(a?.type ?? 'artist'),
            image: normalizeImages(a?.image),
            url: String(a?.url ?? ''),
          }))
        : primaryArtists,
    },
    image: normalizeImages(raw?.image),
    downloadUrl: normalizeDownloadUrls(raw?.downloadUrl),
  };
};

export const normalizeArtistMini = (raw: any): ArtistMini => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? raw?.title ?? 'Unknown Artist'),
  role: String(raw?.role ?? ''),
  type: String(raw?.type ?? 'artist'),
  image: normalizeImages(raw?.image),
  url: String(raw?.url ?? ''),
});

export const normalizeAlbum = (raw: any): Album => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? raw?.title ?? 'Unknown Album'),
  description: String(raw?.description ?? ''),
  year: toNumberOrNull(raw?.year),
  type: String(raw?.type ?? 'album'),
  playCount: toNumberOrNull(raw?.playCount),
  language: String(raw?.language ?? 'unknown'),
  explicitContent: toBoolean(raw?.explicitContent),
  artists: {
    primary: Array.isArray(raw?.artists?.primary)
      ? raw.artists.primary.map(normalizeArtistMini)
      : splitArtists(raw?.primaryArtists),
    featured: Array.isArray(raw?.artists?.featured)
      ? raw.artists.featured.map(normalizeArtistMini)
      : [],
    all: Array.isArray(raw?.artists?.all)
      ? raw.artists.all.map(normalizeArtistMini)
      : splitArtists(raw?.primaryArtists),
  },
  songCount: toNumberOrNull(raw?.songCount),
  url: String(raw?.url ?? ''),
  image: normalizeImages(raw?.image),
  songs: Array.isArray(raw?.songs) ? raw.songs.map(normalizeSong) : null,
});

export const normalizePlaylist = (raw: any): Playlist => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? raw?.title ?? 'Unknown Playlist'),
  description: toStringOrNull(raw?.description),
  year: toNumberOrNull(raw?.year),
  type: String(raw?.type ?? 'playlist'),
  playCount: toNumberOrNull(raw?.playCount),
  language: String(raw?.language ?? 'unknown'),
  explicitContent: toBoolean(raw?.explicitContent),
  songCount: toNumberOrNull(raw?.songCount),
  url: String(raw?.url ?? ''),
  image: normalizeImages(raw?.image),
  songs: Array.isArray(raw?.songs) ? raw.songs.map(normalizeSong) : null,
  artists: Array.isArray(raw?.artists) ? raw.artists.map(normalizeArtistMini) : null,
});

export const normalizeArtist = (raw: any): Artist => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? 'Unknown Artist'),
  url: String(raw?.url ?? ''),
  type: String(raw?.type ?? 'artist'),
  image: normalizeImages(raw?.image),
  followerCount: toNumberOrNull(raw?.followerCount),
  fanCount: toStringOrNull(raw?.fanCount),
  isVerified: toNullableBoolean(raw?.isVerified),
  dominantLanguage: toStringOrNull(raw?.dominantLanguage),
  dominantType: toStringOrNull(raw?.dominantType),
  bio: Array.isArray(raw?.bio)
    ? raw.bio.map((entry: any) => ({
        text: toStringOrNull(entry?.text),
        title: toStringOrNull(entry?.title),
        sequence: toNumberOrNull(entry?.sequence),
      }))
    : null,
  dob: toStringOrNull(raw?.dob),
  fb: toStringOrNull(raw?.fb),
  twitter: toStringOrNull(raw?.twitter),
  wiki: toStringOrNull(raw?.wiki),
  availableLanguages: Array.isArray(raw?.availableLanguages)
    ? raw.availableLanguages.map((lang: unknown) => String(lang))
    : [],
  isRadioPresent: toNullableBoolean(raw?.isRadioPresent),
  topSongs: Array.isArray(raw?.topSongs) ? raw.topSongs.map(normalizeSong) : null,
  topAlbums: Array.isArray(raw?.topAlbums) ? raw.topAlbums.map(normalizeAlbum) : null,
  singles: Array.isArray(raw?.singles) ? raw.singles.map(normalizeSong) : null,
  similarArtists: Array.isArray(raw?.similarArtists)
    ? raw.similarArtists.map((artist: any) => ({
        id: String(artist?.id ?? ''),
        name: String(artist?.name ?? 'Unknown Artist'),
        url: String(artist?.url ?? ''),
        image: normalizeImages(artist?.image),
        type: String(artist?.type ?? 'artist'),
      }))
    : null,
});