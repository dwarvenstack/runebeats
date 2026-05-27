// src/music/MusicQueue.js
// Per-guild music state: queue, controls, playback lifecycle.

import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  AudioPlayerStatus,
} from '@discordjs/voice';
import { buildAudioPlayer, createResource } from './AudioPlayer.js';
import logger from '../utils/logger.js';

export const LOOP_MODES = { NONE: 'none', SONG: 'song', QUEUE: 'queue' };

const MAX_HISTORY = 20;

export class MusicQueue {
  /**
   * @param {object} opts
   * @param {import('discord.js').Guild} opts.guild
   * @param {import('discord.js').TextChannel} opts.textChannel
   */
  constructor({ guild, textChannel }) {
    this.guild       = guild;
    this.textChannel = textChannel;

    /** @type {import('./Song.js').Song[]} */
    this.queue   = [];
    /** @type {import('./Song.js').Song | null} */
    this.currentSong = null;
    /** @type {import('./Song.js').Song[]} */
    this.history = [];

    this.volume    = 80;
    this.loopMode  = LOOP_MODES.NONE;
    this.startedAt = null;
    this.seekOffset = 0;

    this.connection  = null;
    this.audioPlayer = buildAudioPlayer();

    this._attachPlayerEvents();
  }

  // ─── Voice Connection ──────────────────────────────────────────────────────

  async join(voiceChannel) {
    if (this.connection) {
      this.connection.joinConfig.channelId = voiceChannel.id;
    }

    this.connection = joinVoiceChannel({
      channelId:      voiceChannel.id,
      guildId:        voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf:       false,
      selfMute:       false,
    });

    this.connection.on('stateChange', (oldState, newState) => {
      logger.info(`[VoiceConnection] ${oldState.status} -> ${newState.status}`);

      // ── Detect external disconnection (right-click disconnect, admin kick) ──
      // When the connection is destroyed externally, Discord moves it to
      // the Destroyed state. We must null out this.connection so that the
      // next /play knows it needs to re-join.
      if (
        newState.status === VoiceConnectionStatus.Destroyed &&
        oldState.status !== VoiceConnectionStatus.Destroyed
      ) {
        logger.info(`[VoiceConnection] Connection destroyed externally in ${this.guild.name}. Resetting connection reference.`);
        this.connection = null;
      }
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      this.connection.destroy();
      this.connection = null;
      throw new Error('Could not connect to voice channel within 30 seconds.');
    }

    this.connection.subscribe(this.audioPlayer);
    logger.info(`[MusicQueue] Joined voice channel: ${voiceChannel.name} in ${this.guild.name}`);
    return this.connection;
  }

  leave() {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
      logger.info(`[MusicQueue] Left voice channel in ${this.guild.name}`);
    }
  }

  /**
   * Called when the bot is forcibly removed from a voice channel.
   * Stops audio, clears all state, and nulls out the connection reference
   * WITHOUT calling connection.destroy() (it's already destroyed externally).
   */
  cleanup() {
    this.audioPlayer.stop(true);
    this.queue       = [];
    this.currentSong = null;
    this.history     = [];
    this.startedAt   = null;
    this.seekOffset  = 0;
    this.loopMode    = LOOP_MODES.NONE;
    // Don't destroy the connection — Discord already did. Just null it.
    this.connection  = null;
    logger.info(`[MusicQueue] Cleanup complete for ${this.guild.name}`);
  }

  // ─── Queue Operations ──────────────────────────────────────────────────────

  add(songs) {
    const arr = Array.isArray(songs) ? songs : [songs];
    this.queue.push(...arr);
    return this.queue.length - arr.length + 1;
  }

  remove(position) {
    const idx = position - 1;
    if (idx < 0 || idx >= this.queue.length) throw new Error('Invalid queue position.');
    return this.queue.splice(idx, 1)[0];
  }

  move(from, to) {
    const maxPos = this.queue.length;
    if (from < 1 || from > maxPos || to < 1 || to > maxPos) {
      throw new Error(`Position out of range. Queue has ${maxPos} song(s).`);
    }
    const [song] = this.queue.splice(from - 1, 1);
    this.queue.splice(to - 1, 0, song);
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  clear() {
    this.queue = [];
  }

  // ─── Playback Controls ─────────────────────────────────────────────────────

  async play(song) {
    if (!this.connection) throw new Error('Not connected to a voice channel.');
    logger.info(`[MusicQueue] Playing: "${song.title}" in ${this.guild.name}`);

    const resource = await createResource(song, this.volume, 0);
    this.audioPlayer.play(resource);
    this.currentSong = song;
    this.startedAt   = Date.now();
    this.seekOffset  = 0;
  }

  pause() {
    return this.audioPlayer.pause();
  }

  resume() {
    return this.audioPlayer.unpause();
  }

  skip() {
    this.audioPlayer.stop(true);
  }

  stop() {
    this.queue = [];
    this.currentSong = null;
    this.audioPlayer.stop(true);
  }

  setVolume(vol) {
    this.volume = Math.max(1, Math.min(100, vol));
    const state = this.audioPlayer.state;
    if (state.status !== 'idle' && state.resource?.volume) {
      state.resource.volume.setVolumeLogarithmic(this.volume / 100);
    }
  }

  setLoop(mode) {
    if (!Object.values(LOOP_MODES).includes(mode)) {
      throw new Error('Invalid loop mode. Use: off, song, queue');
    }
    this.loopMode = mode;
  }

  async seek(seconds) {
    if (!this.currentSong) throw new Error('Nothing is playing.');
    if (!this.connection) throw new Error('Not connected to a voice channel.');
    const resource = await createResource(this.currentSong, this.volume, seconds);
    this.audioPlayer.play(resource);
    this.seekOffset  = seconds;
    this.startedAt   = Date.now();
  }

  get elapsedSeconds() {
    if (!this.startedAt) return 0;
    return this.seekOffset + Math.floor((Date.now() - this.startedAt) / 1000);
  }

  // ─── Internal Event Wiring ─────────────────────────────────────────────────

  _attachPlayerEvents() {
    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      // If the connection was destroyed (bot was kicked), don't try to play next
      if (!this.connection) {
        logger.info(`[MusicQueue] Audio player went idle but connection is gone. Skipping auto-play.`);
        this.currentSong = null;
        return;
      }

      if (this.currentSong) {
        this.history.push(this.currentSong);
        if (this.history.length > MAX_HISTORY) this.history.shift();
      }

      if (this.loopMode === LOOP_MODES.SONG && this.currentSong) {
        this.queue.unshift(this.currentSong);
      } else if (this.loopMode === LOOP_MODES.QUEUE && this.currentSong) {
        this.queue.push(this.currentSong);
      }

      this.currentSong = null;

      const next = this.queue.shift();
      if (!next) {
        logger.info(`[MusicQueue] Queue exhausted in ${this.guild.name}`);
        return;
      }

      try {
        await this.play(next);
        this.textChannel.send({
          embeds: [
            (await import('../utils/embeds.js')).nowPlayingEmbed(next, 0),
          ],
        });
      } catch (err) {
        logger.error('[MusicQueue] Error playing next song:', err);
        this.textChannel.send(`❌ Could not play **${next.title}**: ${err.message}`).catch(() => {});
        this.audioPlayer.emit(AudioPlayerStatus.Idle);
      }
    });

    this.audioPlayer.on('error', err => {
      logger.error('[AudioPlayer] Error:', err.message);
      this.textChannel.send(`❌ Audio error: ${err.message}`).catch(() => {});
    });
  }
}

// ─── Per-Guild State Registry ─────────────────────────────────────────────────

/** @type {Map<string, MusicQueue>} */
const queues = new Map();

export function getQueue(guild, textChannel) {
  if (!queues.has(guild.id)) {
    queues.set(guild.id, new MusicQueue({ guild, textChannel }));
  }
  const q = queues.get(guild.id);
  if (textChannel) q.textChannel = textChannel;
  return q;
}

export function deleteQueue(guildId) {
  queues.delete(guildId);
}
