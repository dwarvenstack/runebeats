// src/index.js
// RuneBeats — Discord Music Bot
// Entry point: initializes the Discord client, loads commands & events, logs in.

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import logger from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Validate required environment variables ──────────────────────────────────

const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    logger.error('Copy .env.example to .env and fill in your credentials.');
    process.exit(1);
  }
}

// ─── Create Discord client ────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

// ─── Auto-register commands when bot joins a new guild ────────────────────────

async function registerCommandsInGuild(guildId, guildName) {
  try {
    const rest          = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commandsPath  = join(__dirname, 'commands');
    const files         = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    const commands = [];
    for (const file of files) {
      const mod = await import(pathToFileURL(join(commandsPath, file)).href);
      if (mod.data) commands.push(mod.data.toJSON());
    }

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commands }
    );

    logger.info(`[Deploy] Registered ${commands.length} command(s) in guild: ${guildName} (${guildId})`);
  } catch (err) {
    logger.error(`[Deploy] Failed to register commands in ${guildName}:`, err.message);
  }
}

client.on('guildCreate', async guild => {
  logger.info(`[RuneBeats] Joined new guild: ${guild.name} (${guild.id})`);
  await registerCommandsInGuild(guild.id, guild.name);
});

// ─── Load handlers ────────────────────────────────────────────────────────────

await loadCommands(client);
await loadEvents(client);

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

function shutdown(signal) {
  logger.info(`[RuneBeats] Received ${signal}. Shutting down gracefully…`);
  client.destroy();
  process.exit(0);
}

process.on('unhandledRejection', err => {
  logger.error('[Unhandled Rejection]', err);
});

// ─── Log in ───────────────────────────────────────────────────────────────────

logger.info('[RuneBeats] Connecting to Discord…');
client.login(process.env.DISCORD_TOKEN);