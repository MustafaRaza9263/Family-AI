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
};

export async function writeGeneratedImage(opts: {
  dataDir: string;
  job: JobRecord;
  bytes: Buffer;
  width: number;
  height: number;
  assets: AssetRepository;
  createdAt: Date;
}): Promise<WrittenAsset> {
  const { job, bytes } = opts;
  const userDir = path.join(opts.dataDir, job.userId);
  await mkdir(userDir, { recursive: true });

  // Insert first to get a stable asset id for the on-disk filename.
  const asset = await opts.assets.create({
    userId: job.userId,
    threadId: job.threadId,
    jobId: job.id,
    kind: 'image',
    filePath: '',
    thumbPath: '',
    mime: 'image/png',
    bytes: bytes.byteLength,
    width: opts.width,
    height: opts.height,
    source: 'generated',
    parentAssetId: job.parentAssetId,
    createdAt: opts.createdAt,
  });

  const filePath = path.join(userDir, `${asset.id}.png`);
  const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
  await writeFile(filePath, bytes);
  await sharp(bytes)
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
    bytes: bytes.byteLength,
  };
}
