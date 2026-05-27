// src/commands/skip.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip to the next song in the queue');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing.')], ephemeral: true });
  }
  const skipped = queue.currentSong.title;
  queue.skip();
  return interaction.reply({ embeds: [successEmbed(`Skipped **${skipped}** ⏭️`)] });
}
