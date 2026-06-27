![Node.js](https://img.shields.io/badge/Node.js-22.x-green) ![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2) ![License](https://img.shields.io/badge/license-MIT-blue)

# 🎵 RuneBeats — Discord Music Bot

Open-source Discord music bot that streams audio from YouTube, SoundCloud, and direct audio URLs. Runs free on Oracle Cloud's Always Free Tier.

---

## Features

- **YouTube** — URLs, playlists, and search queries
- **SoundCloud** — tracks and sets/playlists
- **Direct audio URLs** — MP3, WAV, OGG, FLAC, AAC, M4A, OPUS, WEBM
- Full queue system — add, remove, move, shuffle, clear
- Loop modes — off, song, queue
- Volume control, seek, pause/resume
- Now Playing embed with progress bar
- Per-server independent queues
- Auto-disconnect when voice channel empties
- All slash commands with autocomplete

---

## Quick Start

### Prerequisites

- Node.js 22 LTS+
- `yt-dlp` installed and on PATH

> **FFmpeg note:** RuneBeats bundles FFmpeg via the [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) npm package, so a separate system install is **not required**. If you already have a system FFmpeg with the `libopus` encoder, the setup script will detect it and prefer it (some `ffmpeg-static` builds lack `libopus`).

### Install yt-dlp

```bash
# Linux/macOS
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp

# Windows (scoop)
scoop install yt-dlp
```

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/runebeats.git
cd runebeats

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials (see below)

# 4. Validate your environment (checks Node, deps, yt-dlp, ffmpeg, .env)
node setup_environment.js

# 5. Register slash commands
npm run deploy

# 6. Start the bot
npm start
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from [discord.dev](https://discord.dev) |
| `CLIENT_ID` | ✅ | Application ID from [discord.dev](https://discord.dev) |
| `GUILD_ID` | Optional | Test server ID — instant command registration |
| `SOUNDCLOUD_CLIENT_ID` | Optional | For SoundCloud support (free at [developers.soundcloud.com](https://developers.soundcloud.com)) |
| `LOG_LEVEL` | Optional | `error`, `warn`, `info` (default), `debug` |

---

## Commands

### Playback
| Command | Description |
|---|---|
| `/play <query\|url>` | Play a song or add to queue |
| `/pause` | Pause playback |
| `/resume` | Resume playback |
| `/skip` | Skip to next song |
| `/stop` | Stop and clear queue |
| `/volume <1-100>` | Set volume |
| `/seek <timestamp>` | Jump to position (e.g. `1:30`) |

### Queue
| Command | Description |
|---|---|
| `/queue [page]` | View the queue |
| `/remove <position>` | Remove a song |
| `/move <from> <to>` | Reorder queue |
| `/shuffle` | Shuffle the queue |
| `/clear` | Clear all queued songs |
| `/loop <off\|song\|queue>` | Set loop mode |

### Info
| Command | Description |
|---|---|
| `/nowplaying` | Current song with progress bar |
| `/history` | Last 10 played songs |
| `/ping` | Bot latency |
| `/help` | All commands |

### Utility
| Command | Description |
|---|---|
| `/join` | Force bot to join your voice channel |
| `/leave` | Disconnect the bot |

---

## Deployment (Oracle Cloud Free Tier)

The bot runs perfectly on Oracle's **VM.Standard.E2.1.Micro** (1 vCPU, 1 GB RAM) — permanently free.

```bash
# On the VM, install dependencies (FFmpeg is bundled via ffmpeg-static — no apt install needed)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
sudo npm install -g pm2

# Clone, configure, and start
git clone https://github.com/yourusername/runebeats.git
cd runebeats
npm install
cp .env.example .env
# fill in .env...
node setup_environment.js
npm run deploy
pm2 start src/index.js --name runebeats
pm2 startup   # auto-restart after VM reboots
pm2 save
```

### PM2 Commands
```bash
pm2 logs runebeats      # View logs
pm2 restart runebeats   # Restart bot
pm2 monit               # Resource monitor
```

---

## Architecture

```
User types /play
     │
     ▼
Discord Slash Command
     │
     ▼
sourceDetector.js     ← YouTube / SoundCloud / Direct URL / Search?
     │
     ▼
Source handler        ← Resolves metadata and stream URL
     │
     ▼
AudioPlayer.js        ← FFmpeg → PCM → Opus → Discord UDP
     │
     ▼
Discord Voice Servers ← Distributes to all channel members
```

Each Discord server gets its own isolated `MusicQueue` instance in memory — queues never cross between servers.

---

## License

MIT — see [LICENSE](LICENSE)