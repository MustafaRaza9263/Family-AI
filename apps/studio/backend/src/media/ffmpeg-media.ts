import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { FrameAt, MediaTools, VideoProbe } from './types.js';

const execFileAsync = promisify(execFile);

export type FfmpegPaths = {
  ffmpegPath: string;
  ffprobePath: string;
};

type ProbeJson = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    nb_frames?: string;
    avg_frame_rate?: string;
    duration?: string;
  }>;
  format?: { duration?: string };
};

function parseFrameRate(rate: string | undefined): number {
  if (!rate || rate === '0/0') return 0;
  const [num, den] = rate.split('/').map(Number);
  if (!num || !den) return 0;
  return num / den;
}

export function createFfmpegMedia(paths: FfmpegPaths): MediaTools {
  return {
    async probeVideo(filePath: string): Promise<VideoProbe> {
      const { stdout } = await execFileAsync(
        paths.ffprobePath,
        [
          '-v',
          'quiet',
          '-print_format',
          'json',
          '-show_format',
          '-show_streams',
          filePath,
        ],
        { maxBuffer: 2 * 1024 * 1024 },
      );
      const parsed = JSON.parse(stdout) as ProbeJson;
      const video = parsed.streams?.find((s) => s.codec_type === 'video');
      if (!video?.width || !video.height) {
        throw new Error(`ffprobe: no video stream in ${filePath}`);
      }
      const durationSec = Number(
        video.duration ?? parsed.format?.duration ?? 0,
      );
      let frames = Number(video.nb_frames ?? 0);
      if (!Number.isFinite(frames) || frames <= 0) {
        const fps = parseFrameRate(video.avg_frame_rate);
        frames =
          fps > 0 && durationSec > 0 ? Math.round(durationSec * fps) : 0;
      }
      return {
        width: video.width,
        height: video.height,
        frames,
        durationSec: Number.isFinite(durationSec) ? durationSec : 0,
      };
    },

    async extractFrame(videoPath: string, at: FrameAt): Promise<Buffer> {
      const dir = await mkdtemp(path.join(tmpdir(), 'studio-frame-'));
      const outPath = path.join(dir, 'frame.png');
      try {
        const args =
          at === 'first'
            ? ['-y', '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath]
            : [
                '-y',
                '-sseof',
                '-0.1',
                '-i',
                videoPath,
                '-update',
                '1',
                '-q:v',
                '2',
                outPath,
              ];
        await execFileAsync(paths.ffmpegPath, args, {
          maxBuffer: 8 * 1024 * 1024,
        });
        return await readFile(outPath);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}

/** Tiny synthetic video for tests (lavfi color source). */
export async function writeLavfiSample(
  ffmpegPath: string,
  outPath: string,
): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=red:s=64x64:d=0.5',
      '-pix_fmt',
      'yuv420p',
      outPath,
    ],
    { maxBuffer: 2 * 1024 * 1024 },
  );
}

export async function binaryAvailable(bin: string): Promise<boolean> {
  try {
    await execFileAsync(bin, ['-version'], { maxBuffer: 1024 * 1024 });
    return true;
  } catch {
    return false;
  }
}
