// src/commands/pause.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause current playback');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing.')], ephemeral: true });
  }
  const paused = queue.pause();
  return interaction.reply({
    embeds: [paused ? successEmbed('Paused ⏸') : warnEmbed('Already paused.')],
  });
}
