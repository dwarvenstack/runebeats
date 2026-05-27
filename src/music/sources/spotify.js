// src/music/sources/spotify.js
// Spotify metadata bridge — extracts track/playlist/album info via Spotify Web API
// and converts to YouTube search queries.

import logger from '../../utils/logger.js';

let accessToken = null;
let tokenExpiry  = 0;

/**
 * Get a Spotify client credentials access token.
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status} ${response.statusText}`);
  }

  const data  = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  logger.info('[Spotify] Access token obtained.');
  return accessToken;
}

/**
 * Spotify API GET helper.
 */
async function spotifyGet(endpoint) {
  const token    = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse a Spotify URL and return its type and ID.
 */
export function parseSpotifyUrl(url) {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error('Invalid Spotify URL. Supported: track, album, playlist.');
  return { type: match[1], id: match[2] };
}

/**
 * Convert a Spotify track object to our internal format.
 */
function formatTrack(track, fallbackThumbnail = null) {
  const artists = track.artists.map(a => a.name).join(', ');
  return {
    searchQuery: `${track.name} ${artists}`,
    title:       `${track.name} — ${artists}`,
    duration:    Math.floor(track.duration_ms / 1000),
    thumbnail:   track.album?.images?.[0]?.url ?? fallbackThumbnail,
    spotifyUrl:  track.external_urls?.spotify ?? '',
  };
}

/**
 * Resolve a Spotify track URL.
 */
export async function resolveSpotifyTrack(url) {
  try {
    const { id } = parseSpotifyUrl(url);
    const track  = await spotifyGet(`/tracks/${id}`);
    logger.info('[Spotify] Resolved track:', track.name);
    return formatTrack(track);
  } catch (err) {
    throw new Error(`Could not resolve Spotify track: ${err.message}`);
  }
}

/**
 * Resolve a Spotify album URL.
 */
export async function resolveSpotifyAlbum(url) {
  try {
    const { id } = parseSpotifyUrl(url);
    const album  = await spotifyGet(`/albums/${id}`);
    logger.info('[Spotify] Resolved album:', album.name, `(${album.tracks.items.length} tracks)`);
    const thumbnail = album.images?.[0]?.url ?? null;
    return album.tracks.items.map(track => formatTrack(track, thumbnail));
  } catch (err) {
    throw new Error(`Could not resolve Spotify album: ${err.message}`);
  }
}

/**
 * Resolve a Spotify playlist URL.
 * Fetches up to 50 tracks.
 */
export async function resolveSpotifyPlaylist(url) {
  try {
    const { id }   = parseSpotifyUrl(url);
    const playlist = await spotifyGet(`/playlists/${id}/tracks?limit=50&fields=items(track(name,duration_ms,artists,album(images),external_urls))`);
    
    const tracks = playlist.items
      .filter(item => item.track && !item.track.is_local)
      .map(item => formatTrack(item.track));

    logger.info('[Spotify] Resolved playlist:', `(${tracks.length} tracks)`);
    return tracks;
  } catch (err) {
    throw new Error(`Could not resolve Spotify playlist: ${err.message}`);
  }
}