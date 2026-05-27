// src/commands/stop.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong && queue.queue.length === 0) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing.')], ephemeral: true });
  }
  queue.stop();
  return interaction.reply({ embeds: [successEmbed('Stopped playback and cleared the queue. ⏹️')] });
}
