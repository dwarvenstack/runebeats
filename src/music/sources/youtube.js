// src/music/sources/youtube.js
// Extracts audio from YouTube using yt-dlp (primary) with ytdl-core fallback.

import { execFile } from 'child_process';
import { promisify } from 'util';
import ytdl from 'ytdl-core';
import { Song } from '../Song.js';
import logger from '../../utils/logger.js';

const execFileAsync = promisify(execFile);

const YT_SEARCH_PREFIX = 'ytsearch1:';

/**
 * Run yt-dlp and return parsed JSON metadata for the given URL or search query.
 */
async function ytDlpInfo(input) {
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--format', 'bestaudio[ext=webm]/bestaudio/best',
    input,
  ];

  const { stdout } = await execFileAsync('yt-dlp', args, { timeout: 30_000 });
  const info = JSON.parse(stdout.trim().split('\n')[0]);
  
  // Extract stream URL from requested_formats or formats array
  const streamUrl = info.url 
    ?? info.requested_formats?.[0]?.url 
    ?? info.formats?.findLast(f => f.acodec !== 'none' && f.url)?.url;

  logger.info('[YouTube] stream URL found:', !!streamUrl);
  return { ...info, url: streamUrl };
}

/**
 * Resolve a YouTube URL or search query to a Song object.
 * @param {string} input        - URL or plain-text search query
 * @param {string} requestedBy  - Discord user ID
 * @returns {Promise<Song>}
 */
export async function resolveYouTube(input, requestedBy) {
  // Determine if input is a URL or a search query
  const isUrl = /youtube\.com|youtu\.be/i.test(input);
  const query = isUrl ? input : `${YT_SEARCH_PREFIX}${input}`;

  let info;
  try {
    info = await ytDlpInfo(query);
    logger.debug('[YouTube] yt-dlp resolved:', info.title);
  } catch (err) {
    // Fallback to ytdl-core for direct URLs
    if (isUrl) {
      logger.warn('[YouTube] yt-dlp failed, falling back to ytdl-core:', err.message);
      return resolveYouTubeViaYtdlCore(input, requestedBy);
    }
    throw new Error(`Could not resolve YouTube query: ${err.message}`);
  }

  return new Song({
    title:      info.title,
    url:        info.webpage_url ?? `https://www.youtube.com/watch?v=${info.id}`,
    streamUrl:  info.url ?? info.webpage_url, // yt-dlp provides direct stream URL
    duration:   info.duration ?? 0,
    thumbnail:  info.thumbnail ?? null,
    requestedBy,
    source:     'YouTube',
  });
}

/**
 * ytdl-core fallback — resolves a direct YouTube URL.
 */
async function resolveYouTubeViaYtdlCore(url, requestedBy) {
  const info = await ytdl.getInfo(url);
  const details = info.videoDetails;
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

  return new Song({
    title:      details.title,
    url:        details.video_url,
    streamUrl:  format.url,
    duration:   parseInt(details.lengthSeconds, 10),
    thumbnail:  details.thumbnails?.[details.thumbnails.length - 1]?.url ?? null,
    requestedBy,
    source:     'YouTube',
  });
}

/**
 * Resolve a YouTube playlist URL to an array of Song objects.
 * Returns up to 50 songs to avoid memory issues.
 */
export async function resolveYouTubePlaylist(url, requestedBy) {
  const args = [
    '--dump-json',
    '--yes-playlist',
    '--no-warnings',
    '--flat-playlist',
    url,
  ];

  let stdout;
  try {
    ({ stdout } = await execFileAsync('yt-dlp', args, { 
    timeout: 60_000,
    maxBuffer: 1024 * 1024 * 50
    }));
  } catch (err) {
    throw new Error(`Could not resolve YouTube playlist: ${err.message}`);
  }

  const entries = stdout
    .trim()
    .split('\n')
    .slice(0, 50) // cap at 50 tracks
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);

  return entries.map(entry => new Song({
    title:      entry.title ?? 'Unknown',
    url:        entry.url ?? entry.webpage_url ?? url,
    streamUrl:  entry.url ?? entry.webpage_url ?? url,
    duration:   entry.duration ?? 0,
    thumbnail:  entry.thumbnail ?? null,
    requestedBy,
    source:     'YouTube',
  }));
}

/**
 * Create an AudioResource stream from a Song (YouTube).
 * We use yt-dlp to get a fresh stream URL at playback time
 * (URLs from yt-dlp expire after ~6 hours).
 */
export async function createYouTubeStream(song) {
  try {
    const info = await ytDlpInfo(song.url);
    logger.info('[YouTube] fresh stream URL obtained, length:', info.url?.length);
    return info.url;
  } catch (err) {
    logger.error('[YouTube] ytDlpInfo failed:', err.message);
    logger.info('[YouTube] falling back to stored streamUrl:', song.streamUrl?.substring(0, 80));
    return song.streamUrl;
  }
}
