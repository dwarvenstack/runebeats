// src/commands/resume.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume paused playback');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing.')], ephemeral: true });
  }
  const resumed = queue.resume();
  return interaction.reply({
    embeds: [resumed ? successEmbed('Resumed ▶️') : warnEmbed('Playback is not paused.')],
  });
}
