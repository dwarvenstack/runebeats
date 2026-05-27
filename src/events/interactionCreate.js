// src/events/interactionCreate.js
import { errorEmbed } from '../utils/embeds.js';
import logger from '../utils/logger.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return interaction.reply({ embeds: [errorEmbed('Unknown command.')], ephemeral: true });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error(`Error executing /${interaction.commandName}:`, err);
    const reply = { embeds: [errorEmbed('An unexpected error occurred. Please try again.')], ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}
