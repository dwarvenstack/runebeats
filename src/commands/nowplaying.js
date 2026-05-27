// src/commands/nowplaying.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { nowPlayingEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show the currently playing song with progress');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing right now.')], ephemeral: true });
  }
  return interaction.reply({ embeds: [nowPlayingEmbed(queue.currentSong, queue.elapsedSeconds)] });
}
