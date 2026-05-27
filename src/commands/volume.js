// src/commands/volume.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set playback volume (1–100)')
  .addIntegerOption(opt =>
    opt.setName('level')
      .setDescription('Volume level (1–100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(interaction) {
  const level = interaction.options.getInteger('level', true);
  const queue = getQueue(interaction.guild, interaction.channel);
  queue.setVolume(level);
  return interaction.reply({ embeds: [successEmbed(`Volume set to **${level}%** 🔊`)] });
}
