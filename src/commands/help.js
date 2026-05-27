// src/commands/help.js
import { SlashCommandBuilder } from 'discord.js';
import { helpEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all RuneBeats commands');

export async function execute(interaction) {
  return interaction.reply({ embeds: [helpEmbed()], ephemeral: true });
}
