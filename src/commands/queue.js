// src/commands/queue.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { queueEmbed, warnEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Display the current queue')
  .addIntegerOption(opt =>
    opt.setName('page')
      .setDescription('Page number')
      .setMinValue(1)
  );

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  const page  = interaction.options.getInteger('page') ?? 1;

  if (!queue.currentSong && queue.queue.length === 0) {
    return interaction.reply({ embeds: [warnEmbed('The queue is empty.')], ephemeral: true });
  }

  return interaction.reply({ embeds: [queueEmbed(queue, page)] });
}
