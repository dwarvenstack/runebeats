// src/music/Song.js
// Immutable data model for a queued track.

export class Song {
  /**
   * @param {object} opts
   * @param {string} opts.title       - Human-readable title
   * @param {string} opts.url         - Original URL (or search query result URL)
   * @param {string} opts.streamUrl   - Actual audio stream URL passed to FFmpeg
   * @param {number} opts.duration    - Duration in seconds (0 for live)
   * @param {string} opts.thumbnail   - Thumbnail image URL
   * @param {string} opts.requestedBy - Discord user ID who requested this
   * @param {string} opts.source      - 'YouTube' | 'SoundCloud' | 'Direct URL'
   */
  constructor({ title, url, streamUrl, duration, thumbnail, requestedBy, source }) {
    this.title       = title       ?? 'Unknown Title';
    this.url         = url         ?? '';
    this.streamUrl   = streamUrl   ?? url ?? '';
    this.duration    = duration    ?? 0;
    this.thumbnail   = thumbnail   ?? null;
    this.requestedBy = requestedBy ?? null;
    this.source      = source      ?? 'Unknown';
    this.addedAt     = Date.now();
  }
}
