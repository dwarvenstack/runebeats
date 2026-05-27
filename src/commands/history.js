// src/commands/history.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { historyEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('Show the last 10 played songs');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (queue.history.length === 0) {
    return interaction.reply({ embeds: [warnEmbed('No history yet.')], ephemeral: true });
  }
  return interaction.reply({ embeds: [historyEmbed(queue.history)] });
}
