// src/commands/clear.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear all upcoming songs from the queue');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (queue.queue.length === 0) {
    return interaction.reply({ embeds: [warnEmbed('The queue is already empty.')], ephemeral: true });
  }
  const count = queue.queue.length;
  queue.clear();
  return interaction.reply({ embeds: [successEmbed(`Cleared **${count}** song(s) from the queue.`)] });
}
