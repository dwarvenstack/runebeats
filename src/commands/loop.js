// src/commands/loop.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue, LOOP_MODES } from '../music/MusicQueue.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';

const LOOP_LABELS = {
  [LOOP_MODES.NONE]:  'Off',
  [LOOP_MODES.SONG]:  'Song 🔂',
  [LOOP_MODES.QUEUE]: 'Queue 🔁',
};

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Set loop mode')
  .addStringOption(opt =>
    opt.setName('mode')
      .setDescription('Loop mode')
      .setRequired(true)
      .addChoices(
        { name: 'Off',   value: LOOP_MODES.NONE  },
        { name: 'Song',  value: LOOP_MODES.SONG  },
        { name: 'Queue', value: LOOP_MODES.QUEUE },
      )
  );

export async function execute(interaction) {
  const mode  = interaction.options.getString('mode', true);
  const queue = getQueue(interaction.guild, interaction.channel);
  try {
    queue.setLoop(mode);
    return interaction.reply({
      embeds: [successEmbed(`Loop mode set to **${LOOP_LABELS[mode]}**.`)],
    });
  } catch (err) {
    return interaction.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
  }
}
