import { Song } from './types';

/**
 * Fallback songs with currently valid JioSaavn IDs and direct stream URLs.
 * This keeps playback functional even when metadata endpoints are unstable.
 */

// Self-contained SVG placeholder — no network dependency
// Pre-encoded base64 of: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#1A1A2E"/><text x="250" y="260" text-anchor="middle" font-size="120" fill="#E85D04">♪</text></svg>
const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgNTAwIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzFBMUEyRSIvPjx0ZXh0IHg9IjI1MCIgeT0iMjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyMCIgZmlsbD0iI0U4NUQwNCI+4pmpPC90ZXh0Pjwvc3ZnPg==';

const makePlaceholderImages = () => [
  { quality: '50x50', url: PLACEHOLDER_IMG },
  { quality: '150x150', url: PLACEHOLDER_IMG },
  { quality: '500x500', url: PLACEHOLDER_IMG },
];

const deriveSizedImages = (originalUrl: string) => {
  if (!originalUrl) return makePlaceholderImages();
  const u50 = originalUrl.replace('500x500', '50x50');
  const u150 = originalUrl.replace('500x500', '150x150');
  return [
    { quality: '50x50', url: u50 },
    { quality: '150x150', url: u150 },
    { quality: '500x500', url: originalUrl },
  ];
};

const track = (
  id: string,
  name: string,
  artistId: string,
  artistName: string,
  albumId: string,
  albumName: string,
  language: string,
  year: string,
  duration: number,
  imageUrl500: string | null,
  url96: string,
  url160: string
): Song => ({
  id,
  name,
  type: 'song',
  year,
  releaseDate: null,
  duration,
  label: 'Loko Music',
  explicitContent: false,
  playCount: null,
  language,
  hasLyrics: false,
  lyricsId: null,
  url: '',
  copyright: null,
  album: {
    id: albumId,
    name: albumName,
    url: '',
  },
  artists: {
    primary: [
      {
        id: artistId,
        name: artistName,
        role: 'Singer',
        type: 'artist',
        image: [],
        url: '',
      },
    ],
    featured: [],
    all: [
      {
        id: artistId,
        name: artistName,
        role: 'Singer',
        type: 'artist',
        image: [],
        url: '',
      },
    ],
  },
  image: imageUrl500 ? deriveSizedImages(imageUrl500) : makePlaceholderImages(),
  downloadUrl: [
    { quality: '96kbps', url: url96 },
    { quality: '160kbps', url: url160 },
  ],
});

/**
 * Validated fallback IDs. Keep this list in sync with FALLBACK_SONGS.
 */
export const FALLBACK_SONG_IDS = [
  'aRZbUYD7', // Tum Hi Ho
  'qZtKBMZ_', // Apna Bana Le
  'e35oBFzL', // Tainu Khabar Nahi
  '4NRpZd1v', // Hawayein
  'faloMmjX', // Chaleya
  'riNBfJ3P', // Sanam Re
  'EUK4PQRi', // Mareez-E-Ishq
  'wcsDiSsA', // O Maahi
];

/**
 * Fallback song data with directly playable stream URLs.
 */
export const FALLBACK_SONGS: Song[] = [
  track(
    'aRZbUYD7', 'Tum Hi Ho', '459320', 'Arijit Singh', '1139549', 'Aashiqui 2',
    'hindi', '2013', 262,
    'https://c.saavncdn.com/430/Aashiqui-2-Hindi-2013-500x500.jpg',
    'https://aac.saavncdn.com/430/5c5ea5cc00e3bff45616013226f376fe_96.mp4',
    'https://aac.saavncdn.com/430/5c5ea5cc00e3bff45616013226f376fe_160.mp4'
  ),
  track(
    'qZtKBMZ_', 'Apna Bana Le', '459320', 'Arijit Singh', '38682222', 'Bhediya',
    'hindi', '2023', 261,
    'https://c.saavncdn.com/815/Bhediya-Hindi-2023-20230927155213-500x500.jpg',
    'https://aac.saavncdn.com/815/483a6e118e8108cbb3e5cd8701674f32_96.mp4',
    'https://aac.saavncdn.com/815/483a6e118e8108cbb3e5cd8701674f32_160.mp4'
  ),
  track(
    'e35oBFzL', 'Tainu Khabar Nahi', '458681', 'Amitabh Bhattacharya', '55303464', 'Munjya',
    'hindi', '2024', 188,
    'https://c.saavncdn.com/009/Munjya-Original-Motion-Picture-Soundtrack-Hindi-2024-20250612102800-500x500.jpg',
    'https://aac.saavncdn.com/009/6d4792a8910d4e3fd7f183ddf5098584_96.mp4',
    'https://aac.saavncdn.com/009/6d4792a8910d4e3fd7f183ddf5098584_160.mp4'
  ),
  track(
    '4NRpZd1v', 'Hawayein', '456323', 'Pritam', '11287835', 'Jab Harry Met Sejal',
    'hindi', '2017', 289,
    'https://c.saavncdn.com/584/Jab-Harry-Met-Sejal-Hindi-2017-20170803161007-500x500.jpg',
    'https://aac.saavncdn.com/584/1c4f10826f2336b0cb7db275f1051f8c_96.mp4',
    'https://aac.saavncdn.com/584/1c4f10826f2336b0cb7db275f1051f8c_160.mp4'
  ),
  track(
    'faloMmjX', 'Chaleya', '455663', 'Anirudh Ravichander', '48037104', 'Jawan',
    'hindi', '2023', 200,
    'https://c.saavncdn.com/047/Jawan-Hindi-2023-20230921190854-500x500.jpg',
    'https://aac.saavncdn.com/047/d1366530468931703ac909e82a3ee788_96.mp4',
    'https://aac.saavncdn.com/047/d1366530468931703ac909e82a3ee788_160.mp4'
  ),
  track(
    'riNBfJ3P', 'Sanam Re', '702592', 'Mithoon', '1699057', 'Sanam Re',
    'hindi', '2016', 308,
    'https://c.saavncdn.com/829/Sanam-Re-Hindi-2015-500x500.jpg',
    'https://aac.saavncdn.com/829/60f214aa16aadb4de15be6db3e962232_96.mp4',
    'https://aac.saavncdn.com/829/60f214aa16aadb4de15be6db3e962232_160.mp4'
  ),
  track(
    'EUK4PQRi', 'Mareez - E - Ishq', '711885', 'Sharib Toshi', '1205636', 'Zid',
    'hindi', '2014', 290,
    'https://c.saavncdn.com/722/Zid-Original-Motion-Picture-Soundtrack-Hindi-2014-20230331114652-500x500.jpg',
    'https://aac.saavncdn.com/722/e9046a35fd9509630fbe2b229713db37_96.mp4',
    'https://aac.saavncdn.com/722/e9046a35fd9509630fbe2b229713db37_160.mp4'
  ),
  track(
    'wcsDiSsA', 'O Maahi', '456323', 'Pritam', '50592774', 'Dunki',
    'hindi', '2023', 233,
    'https://c.saavncdn.com/139/Dunki-Hindi-2023-20231220211003-500x500.jpg',
    'https://aac.saavncdn.com/139/61036495c7ba45adf72a856b60f054fd_96.mp4',
    'https://aac.saavncdn.com/139/61036495c7ba45adf72a856b60f054fd_160.mp4'
  ),
];

export default FALLBACK_SONGS;