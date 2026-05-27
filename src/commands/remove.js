// src/commands/remove.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';
import { truncate } from '../utils/formatters.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a song from the queue by position')
  .addIntegerOption(opt =>
    opt.setName('position')
      .setDescription('Queue position to remove')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const queue    = getQueue(interaction.guild, interaction.channel);
  const position = interaction.options.getInteger('position', true);
  try {
    const removed = queue.remove(position);
    return interaction.reply({ embeds: [successEmbed(`Removed **${truncate(removed.title, 60)}** from the queue.`)] });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }
}
