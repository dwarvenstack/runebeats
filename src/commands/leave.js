// src/commands/leave.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue, deleteQueue } from '../music/MusicQueue.js';
import { successEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Disconnect RuneBeats from the voice channel');

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.connection) {
    return interaction.reply({ embeds: [warnEmbed("I'm not in a voice channel.")], ephemeral: true });
  }
  queue.leave();
  deleteQueue(interaction.guild.id);
  return interaction.reply({ embeds: [successEmbed('Disconnected. Goodbye! 👋')] });
}
