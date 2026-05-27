// src/deploy-commands.js
import 'dotenv/config';
import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

// ── Load command data ──────────────────────────────────────────────────────────
const commandsPath = join(__dirname, 'commands');
const files        = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

const commands = [];
for (const file of files) {
  const mod = await import(pathToFileURL(join(commandsPath, file)).href);
  if (mod.data) commands.push(mod.data.toJSON());
}

// ── Fetch all guilds the bot is in ────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(DISCORD_TOKEN);
await new Promise(res => client.once('ready', res));

const guildIds = client.guilds.cache.map(g => g.id);
await client.destroy();

// ── Register commands to every guild ─────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

console.log(`⏳ Registering ${commands.length} command(s) to ${guildIds.length} guild(s)...`);

for (const guildId of guildIds) {
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guildId),
      { body: commands }
    );
    console.log(`✅ Registered ${data.length} command(s) in guild ${guildId}`);
  } catch (err) {
    console.error(`❌ Failed for guild ${guildId}:`, err.message);
  }
}

console.log('✅ Done! Commands are instantly available in all servers.');