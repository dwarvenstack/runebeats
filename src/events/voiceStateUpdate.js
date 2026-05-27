// src/events/voiceStateUpdate.js
// Auto-disconnect when the bot is the only one left in a voice channel.

import { getQueue, deleteQueue } from '../music/MusicQueue.js';
import logger from '../utils/logger.js';

export const name = 'voiceStateUpdate';
export const once = false;

export function execute(oldState, newState) {
  const guild   = oldState.guild ?? newState.guild;
  const botUser = guild.members.me;

  // ── Handle bot being forcibly disconnected (right-click disconnect) ──────
  // When the bot itself is moved to null channel (kicked from VC), clean up.
  if (oldState.member?.id === botUser?.id) {
    // Bot was disconnected (moved to no channel)
    if (oldState.channelId && !newState.channelId) {
      logger.info(`[VoiceStateUpdate] Bot was forcibly disconnected in ${guild.name}. Cleaning up queue.`);
      const queue = getQueue(guild, null);
      queue.cleanup();      // stop audio + null out connection, clear queue
      deleteQueue(guild.id);
    }
    return;
  }

  // ── Handle auto-disconnect when channel becomes empty ────────────────────
  const botChannel = botUser?.voice?.channel;
  if (!botChannel) return; // Bot isn't in a voice channel

  const humanMembers = botChannel.members.filter(m => !m.user.bot);
  if (humanMembers.size > 0) return;

  logger.info(`[VoiceStateUpdate] Channel empty in ${guild.name}, auto-disconnecting.`);

  const queue = getQueue(guild, null);
  if (queue.textChannel) {
    queue.textChannel
      .send('👋 Left the voice channel because it was empty.')
      .catch(() => {});
  }
  queue.cleanup();
  deleteQueue(guild.id);
}
