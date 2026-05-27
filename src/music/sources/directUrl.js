// src/music/sources/directUrl.js
// Validates and streams direct audio file URLs.

import https from 'https';
import http from 'http';
import { Song } from '../Song.js';
import logger from '../../utils/logger.js';

const ALLOWED_CONTENT_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a',
  'audio/opus', 'audio/webm', 'video/webm', 'application/ogg',
];

/**
 * Fetch just the headers for a URL (HEAD request).
 */
function headRequest(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD' }, res => {
      resolve({
        contentType: res.headers['content-type']?.split(';')[0]?.trim() ?? '',
        statusCode:  res.statusCode,
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('HEAD request timed out')); });
    req.end();
  });
}

/**
 * Resolve a direct audio URL to a Song.
 * Validates that the URL returns an audio Content-Type.
 */
export async function resolveDirectUrl(url, requestedBy) {
  let head;
  try {
    head = await headRequest(url);
  } catch (err) {
    logger.warn('[DirectURL] HEAD request failed:', err.message);
    // Proceed anyway — some servers block HEAD
    head = { contentType: 'audio/mpeg', statusCode: 200 };
  }

  if (head.statusCode >= 400) {
    throw new Error(`URL returned HTTP ${head.statusCode}. Make sure the file is publicly accessible.`);
  }

  const isAudio = ALLOWED_CONTENT_TYPES.some(t => head.contentType.startsWith(t));
  if (!isAudio && head.contentType) {
    throw new Error(
      `URL does not appear to be an audio file (Content-Type: \`${head.contentType}\`). ` +
      'Supported formats: MP3, WAV, OGG, FLAC, AAC, M4A, OPUS, WEBM.'
    );
  }

  // Derive a title from the filename in the URL
  const filename = url.split('/').pop().split('?')[0] || 'Audio Stream';
  const title = decodeURIComponent(filename).replace(/\.[^.]+$/, '');

  logger.debug('[DirectURL] resolved:', title);

  return new Song({
    title,
    url,
    streamUrl:  url,
    duration:   0, // Unknown for direct URLs
    thumbnail:  null,
    requestedBy,
    source:     'Direct URL',
  });
}
