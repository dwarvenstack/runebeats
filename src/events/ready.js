// src/events/ready.js
import logger from '../utils/logger.js';

export const name = 'ready';
export const once = true;

export function execute(client) {
  logger.info(`✅ RuneBeats is online as ${client.user.tag}`);
  logger.info(`   Serving ${client.guilds.cache.size} guild(s).`);
  client.user.setActivity('🎵 /play to start', { type: 2 /* Listening */ });
}
