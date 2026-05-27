// src/commands/seek.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed, warnEmbed } from '../utils/embeds.js';
import { parseTimestamp, formatDuration } from '../utils/formatters.js';

export const data = new SlashCommandBuilder()
  .setName('seek')
  .setDescription('Jump to a position in the current song')
  .addStringOption(opt =>
    opt.setName('timestamp')
      .setDescription('Timestamp to seek to (e.g. 1:30 or 90)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const queue = getQueue(interaction.guild, interaction.channel);
  if (!queue.currentSong) {
    return interaction.reply({ embeds: [warnEmbed('Nothing is playing.')], ephemeral: true });
  }

  const raw = interaction.options.getString('timestamp', true);
  const seconds = parseTimestamp(raw);
  if (seconds === null) {
    return interaction.reply({ embeds: [errorEmbed('Invalid timestamp format. Use `1:30` or `90`.')], ephemeral: true });
  }

  if (queue.currentSong.duration > 0 && seconds > queue.currentSong.duration) {
    return interaction.reply({
      embeds: [errorEmbed(`Timestamp exceeds song duration (${formatDuration(queue.currentSong.duration)}).`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  try {
    await queue.seek(seconds);
    return interaction.editReply({ embeds: [successEmbed(`Seeked to \`${formatDuration(seconds)}\` ⏩`)] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(err.message)] });
  }
}
