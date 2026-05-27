// src/utils/embeds.js
// Discord embed builders for RuneBeats.

import { EmbedBuilder } from 'discord.js';
import { formatDuration, progressBar, truncate } from './formatters.js';

const COLOR_PRIMARY  = 0x5865F2; // Blurple
const COLOR_SUCCESS  = 0x57F287; // Green
const COLOR_ERROR    = 0xED4245; // Red
const COLOR_WARN     = 0xFEE75C; // Yellow
const COLOR_INFO     = 0x5865F2;

const RUNEBEATS_ICON = '🎵';

// ─── Now Playing ─────────────────────────────────────────────────────────────

export function nowPlayingEmbed(song, currentSeconds = 0) {
  const bar = progressBar(currentSeconds, song.duration);
  const elapsed = formatDuration(currentSeconds);
  const total   = formatDuration(song.duration);

  const embed = new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setAuthor({ name: `${RUNEBEATS_ICON} Now Playing` })
    .setTitle(truncate(song.title, 80))
    .setURL(song.url)
    .addFields(
      { name: 'Duration', value: `\`${elapsed} / ${total}\``, inline: true },
      { name: 'Requested by', value: `<@${song.requestedBy}>`, inline: true },
      { name: 'Source', value: song.source, inline: true },
      { name: 'Progress', value: `\`${bar}\`` },
    )
    .setFooter({ text: 'RuneBeats' });

  if (song.thumbnail) embed.setThumbnail(song.thumbnail);
  return embed;
}

// ─── Added to Queue ──────────────────────────────────────────────────────────

export function addedToQueueEmbed(song, position) {
  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setAuthor({ name: `${RUNEBEATS_ICON} Added to Queue` })
    .setTitle(truncate(song.title, 80))
    .setURL(song.url)
    .addFields(
      { name: 'Duration', value: `\`${formatDuration(song.duration)}\``, inline: true },
      { name: 'Position in Queue', value: `#${position}`, inline: true },
      { name: 'Requested by', value: `<@${song.requestedBy}>`, inline: true },
    )
    .setFooter({ text: 'RuneBeats' });
}

// ─── Queue List ───────────────────────────────────────────────────────────────

export function queueEmbed(state, page = 1) {
  const PAGE_SIZE = 10;
  const queue     = state.queue;
  const total     = queue.length;
  const pages     = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage  = Math.min(Math.max(page, 1), pages);
  const start     = (safePage - 1) * PAGE_SIZE;
  const slice     = queue.slice(start, start + PAGE_SIZE);

  const lines = slice.map((song, i) => {
    const pos = start + i + 1;
    return `\`${pos}.\` [${truncate(song.title, 35)}](${song.url}) — \`${formatDuration(song.duration)}\``;
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setAuthor({ name: `${RUNEBEATS_ICON} Queue` })
    .setFooter({ text: `Page ${safePage}/${pages} · ${total} song${total !== 1 ? 's' : ''} · RuneBeats` });

  if (state.currentSong) {
    embed.addFields({
      name: '▶ Now Playing',
      value: `[${truncate(state.currentSong.title, 60)}](${state.currentSong.url})`,
    });
  }

  if (lines.length > 0) {
    embed.addFields({ name: 'Up Next', value: lines.join('\n') });
  } else {
    embed.setDescription('The queue is empty. Use `/play` to add songs!');
  }

  return embed;
}

// ─── History ──────────────────────────────────────────────────────────────────

export function historyEmbed(history) {
  const lines = history.slice().reverse().slice(0, 10).map((song, i) =>
    `\`${i + 1}.\` [${truncate(song.title, 50)}](${song.url}) — \`${formatDuration(song.duration)}\``
  );

  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setAuthor({ name: `${RUNEBEATS_ICON} Recently Played` })
    .setDescription(lines.length ? lines.join('\n') : 'No history yet.')
    .setFooter({ text: 'RuneBeats' });
}

// ─── Error ────────────────────────────────────────────────────────────────────

export function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLOR_ERROR)
    .setDescription(`❌ ${message}`)
    .setFooter({ text: 'RuneBeats' });
}

// ─── Success ─────────────────────────────────────────────────────────────────

export function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setDescription(`✅ ${message}`)
    .setFooter({ text: 'RuneBeats' });
}

// ─── Warning ─────────────────────────────────────────────────────────────────

export function warnEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLOR_WARN)
    .setDescription(`⚠️ ${message}`)
    .setFooter({ text: 'RuneBeats' });
}

// ─── Help ─────────────────────────────────────────────────────────────────────

export function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setAuthor({ name: `${RUNEBEATS_ICON} RuneBeats — Command Reference` })
    .addFields(
      {
        name: '🎶 Playback',
        value: [
          '`/play <query|url>` — Play a song or add to queue',
          '`/pause` — Pause playback',
          '`/resume` — Resume playback',
          '`/skip` — Skip to next song',
          '`/stop` — Stop and clear queue',
          '`/volume <1-100>` — Set volume',
          '`/seek <timestamp>` — Jump to position (e.g. `1:30`)',
        ].join('\n'),
      },
      {
        name: '📋 Queue',
        value: [
          '`/queue [page]` — View the queue',
          '`/remove <position>` — Remove a song',
          '`/move <from> <to>` — Reorder queue',
          '`/shuffle` — Shuffle the queue',
          '`/clear` — Clear all songs',
          '`/loop <off|song|queue>` — Set loop mode',
        ].join('\n'),
      },
      {
        name: 'ℹ️ Info',
        value: [
          '`/nowplaying` — Current song with progress',
          '`/history` — Last 10 played songs',
          '`/ping` — Bot latency',
          '`/help` — This message',
        ].join('\n'),
      },
      {
        name: '🔧 Utility',
        value: [
          '`/join` — Force bot to join your channel',
          '`/leave` — Disconnect the bot',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'RuneBeats · Open Source Music Bot' });
}
