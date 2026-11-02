import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRecord } from '../db/repositories/job-repository.js';

export type WrittenAsset = {
  assetId: string;
  width: number;
  height: number;
  bytes: number;
  frames?: number;
  durationSec?: number;
};

export async function writeImageOutput(opts: {
  dataDir: string;
  job: JobRecord;
  bytes: Buffer;
  width: number;
  height: number;
  assets: AssetRepository;
  createdAt: Date;
  source?: 'generated' | 'derived';
  parentAssetId?: string;
  userId?: string;
  mime?: string;
}): Promise<WrittenAsset> {
  const userId = opts.userId ?? opts.job.userId;
  const userDir = path.join(opts.dataDir, userId);
  await mkdir(userDir, { recursive: true });

  const asset = await opts.assets.create({
    userId,
    threadId: opts.job.threadId,
    jobId: opts.job.id,
    kind: 'image',
    filePath: '',
    thumbPath: '',
    mime: opts.mime ?? 'image/png',
    bytes: opts.bytes.byteLength,
    width: opts.width,
    height: opts.height,
    source: opts.source ?? 'generated',
    parentAssetId: opts.parentAssetId ?? opts.job.parentAssetId,
    createdAt: opts.createdAt,
  });

  const filePath = path.join(userDir, `${asset.id}.png`);
  const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
  await writeFile(filePath, opts.bytes);
  await sharp(opts.bytes)
    .rotate()
    .resize({
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  await opts.assets.updatePaths(asset.id, filePath, thumbPath);

  return {
    assetId: asset.id,
    width: opts.width,
    height: opts.height,
    bytes: opts.bytes.byteLength,
  };
}
