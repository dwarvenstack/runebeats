// src/handlers/eventHandler.js
// Dynamically loads all event files from src/events/.

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  const files      = readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = pathToFileURL(join(eventsPath, file)).href;
    const event    = await import(filePath);

    if (!event.name || !event.execute) {
      logger.warn(`[EventHandler] Skipping ${file} — missing name or execute.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    logger.debug(`[EventHandler] Registered event: ${event.name}`);
  }

  logger.info(`[EventHandler] Registered ${files.length} event(s).`);
}
