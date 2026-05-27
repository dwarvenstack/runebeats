// src/commands/shuffle.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Shuffle the queue');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (queue.queue.length < 2) {
    return interaction.reply({ embeds: [warnEmbed('Not enough songs to shuffle.')], ephemeral: true });
  }
  queue.shuffle();
  return interaction.reply({ embeds: [successEmbed(`Shuffled ${queue.queue.length} songs. 🔀`)] });
}
