// src/music/sources/soundcloud.js
// Fetches audio from SoundCloud via soundcloud-downloader.

import scdl from 'soundcloud-downloader';
import { Song } from '../Song.js';
import logger from '../../utils/logger.js';

const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

/**
 * Resolve a SoundCloud track URL to a Song object.
 * @param {string} url
 * @param {string} requestedBy
 * @returns {Promise<Song>}
 */
export async function resolveSoundCloud(url, requestedBy) {
  if (!CLIENT_ID) {
    throw new Error('SoundCloud client ID is not configured. Set SOUNDCLOUD_CLIENT_ID in .env');
  }

  let info;
  try {
    info = await scdl.getInfo(url, CLIENT_ID);
    logger.debug('[SoundCloud] resolved:', info.title);
  } catch (err) {
    throw new Error(`Could not resolve SoundCloud track: ${err.message}`);
  }

  const thumbnail = info.artwork_url?.replace('-large', '-t500x500') ?? null;

  return new Song({
    title:      info.title,
    url:        info.permalink_url,
    streamUrl:  url, // We'll stream at play time via scdl.download()
    duration:   Math.floor((info.duration ?? 0) / 1000), // ms → s
    thumbnail,
    requestedBy,
    source:     'SoundCloud',
  });
}

/**
 * Resolve a SoundCloud playlist/set to an array of Song objects.
 * Capped at 50 tracks.
 */
export async function resolveSoundCloudPlaylist(url, requestedBy) {
  if (!CLIENT_ID) {
    throw new Error('SoundCloud client ID is not configured.');
  }

  const set = await scdl.getSetInfo(url, CLIENT_ID);
  const tracks = (set.tracks ?? []).slice(0, 50);

  return tracks.map(info => {
    const thumbnail = info.artwork_url?.replace('-large', '-t500x500') ?? null;
    return new Song({
      title:      info.title,
      url:        info.permalink_url,
      streamUrl:  info.permalink_url,
      duration:   Math.floor((info.duration ?? 0) / 1000),
      thumbnail,
      requestedBy,
      source:     'SoundCloud',
    });
  });
}

/**
 * Returns a readable stream for the SoundCloud track (used at playback time).
 */
export async function createSoundCloudStream(song) {
  if (!CLIENT_ID) throw new Error('SoundCloud client ID not set.');
  return scdl.download(song.streamUrl, CLIENT_ID);
}
