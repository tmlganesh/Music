import { ImageQuality } from '../api/types';

/**
 * Get the best quality image URL from an array of image qualities
 * Prefers 500x500, falls back to 150x150, then 50x50
 */
export const getImageUrl = (
  images: ImageQuality[] | undefined,
  preferredQuality: '500x500' | '150x150' | '50x50' = '500x500'
): string => {
  if (!images || images.length === 0) {
    return getPlaceholderImage();
  }

  // Try preferred quality first
  const preferred = images.find(
    (img) => img.quality === preferredQuality || img.url?.includes(preferredQuality)
  );
  if (preferred?.url && preferred.url.length > 10) return preferred.url;

  // Fallback: pick the last one (usually highest quality)
  const lastUrl = images[images.length - 1]?.url;
  if (lastUrl && lastUrl.length > 10) return lastUrl;

  const firstUrl = images[0]?.url;
  if (firstUrl && firstUrl.length > 10) return firstUrl;

  return getPlaceholderImage();
};

/**
 * Get a consistent placeholder image for songs/albums
 * Uses an inline SVG data URI — no network dependency
 */
const getPlaceholderImage = (): string => {
  // Pre-encoded: <svg viewBox="0 0 500 500"><rect fill="#1A1A2E"/><text fill="#9CA3AF">♪</text></svg>
  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgNTAwIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzFBMUEyRSIvPjx0ZXh0IHg9IjI1MCIgeT0iMjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyMCIgZmlsbD0iIzlDQTNBRiI+4pmpPC90ZXh0Pjwvc3ZnPg==';
};

/**
 * Check if an image URL is a known JioSaavn placeholder or broken URL
 */
export const isPlaceholderImage = (url: string | undefined): boolean => {
  if (!url) return true;
  if (url.includes('placeholder')) return true;
  const placeholders = [
    'default',
    '_i/3.0/',
    'artist-default',
    'album-default',
    'playlist-default',
  ];
  return placeholders.some((p) => url.toLowerCase().includes(p));
};

/**
 * Get the best download URL (prefer 320kbps → 160kbps → 96kbps)
 */
export const getDownloadUrl = (
  urls: Array<{ quality: string; url: string }> | undefined
): string | null => {
  if (!urls || urls.length === 0) return null;

  const qualityOrder = ['160kbps', '96kbps', '320kbps', '48kbps', '12kbps'];
  for (const quality of qualityOrder) {
    const match = urls.find((u) => u.quality === quality && u.url?.length > 5);
    if (match) return match.url;
  }

  // Last resort: return any URL that looks valid
  const anyValid = urls.find((u) => u.url?.startsWith('http'));
  return anyValid?.url || null;
};

/**
 * Get artist names from a song's primary artists
 */
export const getArtistNames = (
  artists: { primary: Array<{ name: string }> } | undefined
): string => {
  if (!artists?.primary?.length) return 'Unknown Artist';
  return artists.primary.map((a) => a.name).join(', ');
};
