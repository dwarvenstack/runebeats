// src/commands/ping.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency');

export async function execute(interaction) {
  const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const ws = interaction.client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: 'Roundtrip Latency', value: `${roundtrip}ms`, inline: true },
      { name: 'WebSocket Heartbeat', value: `${ws}ms`, inline: true },
    )
    .setFooter({ text: 'RuneBeats' });

  return interaction.editReply({ content: null, embeds: [embed] });
}
