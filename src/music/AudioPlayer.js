// src/music/AudioPlayer.js
import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { createYouTubeStream } from './sources/youtube.js';
import { createSoundCloudStream } from './sources/soundcloud.js';
import logger from '../utils/logger.js';

function buildFfmpegStream(input, seekSeconds = 0) {
  const args = [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
  ];

  if (typeof input === 'string') {
    args.push('-i', input);
  } else {
    args.push('-i', 'pipe:0');
  }

  if (seekSeconds > 0) {
    args.push('-ss', String(seekSeconds));
  }

  args.push(
    '-vn',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '128k',
    '-f', 'opus',
    'pipe:1',
  );

  const ffmpeg = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', data => {
    logger.info('[FFmpeg]', data.toString().trim());
  });

  if (typeof input !== 'string' && input instanceof Readable) {
    input.pipe(ffmpeg.stdin);
    input.on('error', err => logger.error('[FFmpeg] input stream error:', err));
    ffmpeg.stdin.on('error', () => {});
  }

  return ffmpeg.stdout;
}

export async function createResource(song, volume = 100, seekSeconds = 0) {
  let rawStream;

  switch (song.source) {
    case 'YouTube': {
      const streamUrl = await createYouTubeStream(song);
      logger.info('[AudioPlayer] Stream URL:', streamUrl?.substring(0, 80));  
      rawStream = buildFfmpegStream(streamUrl, seekSeconds);
      break;
    }
    case 'SoundCloud': {
      const scStream = await createSoundCloudStream(song);
      rawStream = buildFfmpegStream(scStream, seekSeconds);
      break;
    }
    default: {
      rawStream = buildFfmpegStream(song.streamUrl, seekSeconds);
    }
  }

  const resource = createAudioResource(rawStream, {
    inputType:    StreamType.OggOpus,
    inlineVolume: true,
  });

  resource.volume?.setVolumeLogarithmic(volume / 100);
  return resource;
}

export function buildAudioPlayer() {
  return createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });
}