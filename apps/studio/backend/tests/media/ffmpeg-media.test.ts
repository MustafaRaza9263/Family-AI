import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  binaryAvailable,
  createFfmpegMedia,
  writeLavfiSample,
} from '../../src/media/ffmpeg-media.js';

const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH ?? 'ffprobe';

describe('ffmpeg media tools', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'studio-media-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('probes and extracts frames from a lavfi sample', async ({ skip }) => {
    if (!(await binaryAvailable(ffmpeg)) || !(await binaryAvailable(ffprobe))) {
      skip();
      return;
    }
    const videoPath = path.join(dir, 'sample.mp4');
    await writeLavfiSample(ffmpeg, videoPath);
    const media = createFfmpegMedia({
      ffmpegPath: ffmpeg,
      ffprobePath: ffprobe,
    });
    const probe = await media.probeVideo(videoPath);
    expect(probe.width).toBe(64);
    expect(probe.height).toBe(64);
    expect(probe.durationSec).toBeGreaterThan(0);

    const first = await media.extractFrame(videoPath, 'first');
    const last = await media.extractFrame(videoPath, 'last');
    expect(first.byteLength).toBeGreaterThan(50);
    expect(last.byteLength).toBeGreaterThan(50);
  });
});
