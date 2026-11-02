import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toAssetDto } from '../mappers/asset.js';
import type { MediaTools } from '../media/types.js';

const frameBodySchema = z.object({
  at: z.enum(['first', 'last']),
});

export type FrameServiceDeps = {
  assets: AssetRepository;
  media: MediaTools;
  dataDir: string;
  clock: Clock;
};

export class FrameService {
  constructor(private readonly deps: FrameServiceDeps) {}

  async extract(userId: string, assetId: string, raw: unknown) {
    const parsed = frameBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid frame request');
    }

    const asset = await this.deps.assets.findById(assetId);
    if (!asset || asset.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }
    if (asset.userId !== userId) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Not your asset');
    }
    if (asset.kind !== 'video') {
      throw new AppError(
        400,
        ErrorCodes.INVALID_INPUT,
        'Frame extraction requires a video asset',
      );
    }

    const png = await this.deps.media.extractFrame(asset.filePath, parsed.data.at);
    const meta = await sharp(png).metadata();
    const width = meta.width ?? 1;
    const height = meta.height ?? 1;

    const userDir = path.join(this.deps.dataDir, userId);
    await mkdir(userDir, { recursive: true });

    const created = await this.deps.assets.create({
      userId,
      threadId: asset.threadId,
      kind: 'image',
      filePath: '',
      thumbPath: '',
      mime: 'image/png',
      bytes: png.byteLength,
      width,
      height,
      source: 'derived',
      parentAssetId: asset.id,
      createdAt: this.deps.clock.now(),
    });

    const filePath = path.join(userDir, `${created.id}.png`);
    const thumbPath = path.join(userDir, `${created.id}.thumb.webp`);
    await writeFile(filePath, png);
    await sharp(png)
      .resize({
        width: 512,
        height: 512,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);
    await this.deps.assets.updatePaths(created.id, filePath, thumbPath);

    const final = await this.deps.assets.findById(created.id);
    if (!final) {
      throw new AppError(500, ErrorCodes.INTERNAL, 'Failed to store frame');
    }
    return { asset: toAssetDto(final) };
  }
}
