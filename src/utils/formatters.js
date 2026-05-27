// src/utils/formatters.js
// Duration formatting and progress bar helpers.

/**
 * Convert total seconds to a human-readable string.
 * e.g. 3723 → "1:02:03"
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Live';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parse a "1:30" or "90" timestamp string to seconds.
 */
export function parseTimestamp(str) {
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/**
 * Render an ASCII/Unicode progress bar.
 * @param {number} current - current position in seconds
 * @param {number} total   - total duration in seconds
 * @param {number} width   - bar width in characters (default 20)
 */
export function progressBar(current, total, width = 20) {
  if (!total || total === 0) return '▬'.repeat(width);
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(Math.max(0, width - filled - 1));
  return bar;
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, maxLen = 50) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
