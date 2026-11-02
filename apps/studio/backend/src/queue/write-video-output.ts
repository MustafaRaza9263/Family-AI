import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRecord } from '../db/repositories/job-repository.js';
import type { MediaTools } from '../media/types.js';
import type { WrittenAsset } from './write-image-output.js';

export async function writeVideoOutput(opts: {
  dataDir: string;
  job: JobRecord;
  bytes: Buffer;
  assets: AssetRepository;
  media: MediaTools;
  createdAt: Date;
}): Promise<WrittenAsset> {
  const { job, bytes } = opts;
  const userDir = path.join(opts.dataDir, job.userId);
  await mkdir(userDir, { recursive: true });

  const asset = await opts.assets.create({
    userId: job.userId,
    threadId: job.threadId,
    jobId: job.id,
    kind: 'video',
    filePath: '',
    thumbPath: '',
    mime: 'video/mp4',
    bytes: bytes.byteLength,
    width: 1,
    height: 1,
    source: 'generated',
    parentAssetId: job.parentAssetId,
    createdAt: opts.createdAt,
  });

  const filePath = path.join(userDir, `${asset.id}.mp4`);
  const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
  await writeFile(filePath, bytes);

  const probe = await opts.media.probeVideo(filePath);
  const posterPng = await opts.media.extractFrame(filePath, 'first');
  await sharp(posterPng)
    .resize({
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  await opts.assets.updatePaths(asset.id, filePath, thumbPath);
  await opts.assets.updateMediaMeta(asset.id, {
    width: probe.width,
    height: probe.height,
    bytes: bytes.byteLength,
    durationSec: probe.durationSec,
  });

  return {
    assetId: asset.id,
    width: probe.width,
    height: probe.height,
    bytes: bytes.byteLength,
    frames: probe.frames,
    durationSec: probe.durationSec,
  };
}
