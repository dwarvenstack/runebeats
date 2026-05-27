// src/commands/join.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Force RuneBeats to join your voice channel');

export async function execute(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel.')], ephemeral: true });
  }

  await interaction.deferReply();
  const queue = getQueue(interaction.guild, interaction.channel);
  try {
    await queue.join(voiceChannel);
    return interaction.editReply({ embeds: [successEmbed(`Joined **${voiceChannel.name}** 🎙️`)] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(err.message)] });
  }
}
