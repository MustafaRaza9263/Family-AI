import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeVideoOutput } from '../../src/queue/write-video-output.js';
import { MemoryAssetRepository } from '../fakes/memory-asset-repository.js';
import {
  binaryAvailable,
  createFfmpegMedia,
  writeLavfiSample,
} from '../../src/media/ffmpeg-media.js';

vi.mock('sharp', () => ({
  default: () => ({
    resize: () => ({
      webp: () => ({
        toFile: async () => undefined,
      }),
    }),
  }),
}));

const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH ?? 'ffprobe';

describe('writeVideoOutput', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'studio-vout-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('stores mp4 + poster and probes dimensions', async ({ skip }) => {
    if (!(await binaryAvailable(ffmpeg)) || !(await binaryAvailable(ffprobe))) {
      skip();
      return;
    }
    const sample = path.join(dir, 'in.mp4');
    await writeLavfiSample(ffmpeg, sample);
    const bytes = await readFile(sample);
    const assets = new MemoryAssetRepository();
    const media = createFfmpegMedia({
      ffmpegPath: ffmpeg,
      ffprobePath: ffprobe,
    });
    const written = await writeVideoOutput({
      dataDir: dir,
      job: {
        id: 'job1',
        userId: 'user1',
        threadId: 't1',
        tool: 'video',
        recipeId: 'video-from-text',
        status: 'running',
        prompt: 'x',
        params: {},
        inputAssetIds: [],
        outputAssetIds: [],
        attempts: 1,
        timings: { queuedAt: new Date() },
      },
      bytes,
      assets,
      media,
      createdAt: new Date(),
    });
    const asset = await assets.findById(written.assetId);
    expect(asset?.kind).toBe('video');
    expect(asset?.mime).toBe('video/mp4');
    expect(asset?.width).toBe(64);
    expect(asset?.height).toBe(64);
    expect(asset?.filePath.endsWith('.mp4')).toBe(true);
    expect(asset?.thumbPath.endsWith('.thumb.webp')).toBe(true);
  });
});
