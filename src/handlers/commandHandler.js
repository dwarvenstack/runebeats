// src/handlers/commandHandler.js
// Dynamically loads all command files from src/commands/ into client.commands.

import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = join(__dirname, '..', 'commands');
  const files        = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const module   = await import(filePath);

    if (!module.data || !module.execute) {
      logger.warn(`[CommandHandler] Skipping ${file} — missing data or execute export.`);
      continue;
    }

    client.commands.set(module.data.name, module);
    logger.debug(`[CommandHandler] Loaded command: /${module.data.name}`);
  }

  logger.info(`[CommandHandler] Loaded ${client.commands.size} command(s).`);
}
