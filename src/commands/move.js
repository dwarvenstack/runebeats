// src/commands/move.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('move')
  .setDescription('Move a song in the queue')
  .addIntegerOption(opt =>
    opt.setName('from').setDescription('Current position').setRequired(true).setMinValue(1)
  )
  .addIntegerOption(opt =>
    opt.setName('to').setDescription('New position').setRequired(true).setMinValue(1)
  );

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  const from  = interaction.options.getInteger('from', true);
  const to    = interaction.options.getInteger('to', true);
  try {
    queue.move(from, to);
    return interaction.reply({ embeds: [successEmbed(`Moved song from position **${from}** to **${to}**.`)] });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }
}
