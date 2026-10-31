import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Clock } from '../lib/clock.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import { toAssetDto } from '../mappers/asset.js';
import { sanitizeUploadImage } from '../uploads/sanitize-image.js';
import type { AssetDto } from '@studio/shared';

export type UploadServiceDeps = {
  assets: AssetRepository;
  dataDir: string;
  clock: Clock;
};

export class UploadService {
  constructor(private readonly deps: UploadServiceDeps) {}

  async uploadImage(userId: string, bytes: Buffer): Promise<AssetDto> {
    const sanitized = await sanitizeUploadImage(bytes);
    const userDir = path.join(this.deps.dataDir, userId);
    await mkdir(userDir, { recursive: true });

    const asset = await this.deps.assets.create({
      userId,
      kind: 'image',
      filePath: '',
      thumbPath: '',
      mime: 'image/png',
      bytes: sanitized.bytes,
      width: sanitized.width,
      height: sanitized.height,
      source: 'upload',
      createdAt: this.deps.clock.now(),
    });

    const filePath = path.join(userDir, `${asset.id}.png`);
    const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
    await writeFile(filePath, sanitized.png);
    await sharp(sanitized.png)
      .resize({
        width: 512,
        height: 512,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);
    await this.deps.assets.updatePaths(asset.id, filePath, thumbPath);

    const stored = await this.deps.assets.findById(asset.id);
    if (!stored) {
      throw new Error('Internal: uploaded asset missing after insert');
    }
    return toAssetDto(stored);
  }
}
