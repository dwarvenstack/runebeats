// src/utils/sourceDetector.js
// Detects what kind of input the user provided.

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.webm'];

export const SOURCE_TYPES = {
  YOUTUBE:    'youtube',
  SOUNDCLOUD: 'soundcloud',
  SPOTIFY:    'spotify',
  DIRECT_URL: 'direct_url',
  SEARCH:     'search',
};

/**
 * Detect the source type from a user-provided query string.
 * @param {string} input
 * @returns {string} one of SOURCE_TYPES
 */
export function detectSource(input) {
  const trimmed = input.trim();

  // YouTube
  if (/youtube\.com|youtu\.be/i.test(trimmed)) {
    return SOURCE_TYPES.YOUTUBE;
  }

  // SoundCloud
  if (/soundcloud\.com/i.test(trimmed)) {
    return SOURCE_TYPES.SOUNDCLOUD;
  }

  // Spotify
  if (/spotify\.com\/(track|album|playlist)\//i.test(trimmed)) {
    return SOURCE_TYPES.SPOTIFY;
  }

  // Direct audio URL (ends in known audio extension)
  try {
    const url      = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    if (AUDIO_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return SOURCE_TYPES.DIRECT_URL;
    }
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return SOURCE_TYPES.DIRECT_URL;
    }
  } catch {
    // Not a URL — fall through to search
  }

  return SOURCE_TYPES.SEARCH;
}

/**
 * Returns true if the YouTube input is a playlist URL.
 */
export function isYouTubePlaylist(input) {
  return /[?&]list=/i.test(input);
}

/**
 * Returns the Spotify content type: 'track', 'album', or 'playlist'.
 */
export function getSpotifyType(input) {
  const match = input.match(/spotify\.com\/(track|album|playlist)\//i);
  return match ? match[1] : null;
}