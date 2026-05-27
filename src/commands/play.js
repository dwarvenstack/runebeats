// src/commands/play.js
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/MusicQueue.js';
import { detectSource, isYouTubePlaylist, getSpotifyType, SOURCE_TYPES } from '../utils/sourceDetector.js';
import { resolveYouTube, resolveYouTubePlaylist } from '../music/sources/youtube.js';
import { resolveSoundCloud, resolveSoundCloudPlaylist } from '../music/sources/soundcloud.js';
import { resolveDirectUrl } from '../music/sources/directUrl.js';
import { resolveSpotifyTrack, resolveSpotifyAlbum, resolveSpotifyPlaylist } from '../music/sources/spotify.js';
import { nowPlayingEmbed, addedToQueueEmbed, successEmbed, errorEmbed } from '../utils/embeds.js';
import logger from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song or add it to the queue')
  .addStringOption(opt =>
    opt.setName('query')
      .setDescription('YouTube URL, Spotify URL, SoundCloud URL, direct audio URL, or search query')
      .setRequired(true)
  );

export async function execute(interaction) {
  const query       = interaction.options.getString('query', true).trim();
  const member      = interaction.member;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to use this.')], flags: 64 });
  }

  const botMember = interaction.guild.members.me;
  const perms     = voiceChannel.permissionsFor(botMember);
  if (!perms.has('Connect') || !perms.has('Speak')) {
    return interaction.reply({ embeds: [errorEmbed('I need **Connect** and **Speak** permissions in your voice channel.')], flags: 64 });
  }

  await interaction.deferReply();

  const queue      = getQueue(interaction.guild, interaction.channel);
  const userId     = interaction.user.id;
  const sourceType = detectSource(query);

  try {
    // ── Join voice channel if not already connected ──
    if (!queue.connection) {
      await queue.join(voiceChannel);
    }

    // ── Spotify ──────────────────────────────────────────────────────────────
    if (sourceType === SOURCE_TYPES.SPOTIFY) {
      const spotifyType  = getSpotifyType(query);
      let spotifyTracks  = [];

      if (spotifyType === 'track') {
        spotifyTracks = [await resolveSpotifyTrack(query)];
      } else if (spotifyType === 'album') {
        spotifyTracks = await resolveSpotifyAlbum(query);
      } else if (spotifyType === 'playlist') {
        spotifyTracks = await resolveSpotifyPlaylist(query);
      }

      if (spotifyTracks.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('No tracks found in that Spotify link.')] });
      }

      // Resolve first track immediately and start playing
      const firstSong = await resolveYouTube(spotifyTracks[0].searchQuery, userId);
      queue.add(firstSong);

      if (!queue.currentSong) {
        const first = queue.queue.shift();
        await queue.play(first);
        await interaction.editReply({ embeds: [nowPlayingEmbed(first, 0)] });
      } else {
        await interaction.editReply({
          embeds: [successEmbed(`🎵 Found **${spotifyTracks.length}** track(s) from Spotify. Adding to queue...`)],
        });
      }

      // Resolve remaining tracks in background in batches of 5
      if (spotifyTracks.length > 1) {
        (async () => {
          const remaining  = spotifyTracks.slice(1);
          const BATCH_SIZE = 5;
          for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
            const batch   = remaining.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
              batch.map(track => resolveYouTube(track.searchQuery, userId).catch(() => null))
            );
            queue.add(results.filter(Boolean));
          }
          logger.info(`[Spotify] Finished queuing all ${spotifyTracks.length} tracks.`);
        })();
      }

      return; // handled above
    }

    // ── Resolve song(s) for all other sources ─────────────────────────────────
    let songs = [];

    if (sourceType === SOURCE_TYPES.YOUTUBE) {
      if (isYouTubePlaylist(query)) {
        songs = await resolveYouTubePlaylist(query, userId);
      } else {
        songs = [await resolveYouTube(query, userId)];
      }

    } else if (sourceType === SOURCE_TYPES.SOUNDCLOUD) {
      if (/\/sets\//i.test(query)) {
        songs = await resolveSoundCloudPlaylist(query, userId);
      } else {
        songs = [await resolveSoundCloud(query, userId)];
      }

    } else {
      // Direct URL or search query → YouTube search
      songs = [await resolveYouTube(query, userId)];
    }

    if (songs.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('No results found.')] });
    }

    const position = queue.add(songs);

    // ── If nothing is playing, start playback now ──
    if (!queue.currentSong) {
      const first = queue.queue.shift();
      await queue.play(first);
      return interaction.editReply({ embeds: [nowPlayingEmbed(first, 0)] });
    }

    // ── Otherwise show "added to queue" confirmation ──
    if (songs.length === 1) {
      return interaction.editReply({ embeds: [addedToQueueEmbed(songs[0], position)] });
    }

    return interaction.editReply({
      embeds: [successEmbed(`Added **${songs.length} songs** to the queue.`)],
    });

  } catch (err) {
    logger.error('[/play]', err);
    return interaction.editReply({ embeds: [errorEmbed(err.message)] });
  }
}