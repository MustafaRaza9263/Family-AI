import { createReadStream } from 'node:fs';
import { access, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Response } from 'express';
import type { AuditRepository } from '../db/repositories/audit-repository.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import type { PublicUser } from '@studio/shared';

export type FilesServiceDeps = {
  assets: AssetRepository;
  audit: AuditRepository;
  clock: Clock;
  logger: Logger;
  dataDir: string;
};

export class FilesService {
  constructor(private readonly deps: FilesServiceDeps) {}

  async sendFile(opts: {
    assetId: string;
    user: PublicUser;
    thumb: boolean;
    download: boolean;
    res: Response;
  }): Promise<void> {
    const asset = await this.deps.assets.findById(opts.assetId);
    if (!asset) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }
    const isOwner = asset.userId === opts.user.id;
    const isAdmin = opts.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Forbidden');
    }

    if (isAdmin && !isOwner && !opts.thumb) {
      await this.deps.audit.create({
        actorId: opts.user.id,
        action: 'asset.view',
        targetUserId: asset.userId,
        targetAssetId: asset.id,
        at: this.deps.clock.now(),
      });
    }

    const abs = resolveUnderDataDir(
      this.deps.dataDir,
      opts.thumb ? asset.thumbPath : asset.filePath,
    );
    try {
      await access(abs);
    } catch {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'File not found');
    }

    const mime = opts.thumb ? 'image/webp' : asset.mime;
    opts.res.setHeader('Content-Type', mime);
    opts.res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    if (opts.download) {
      const name = path.basename(abs);
      opts.res.setHeader(
        'Content-Disposition',
        `attachment; filename="${name}"`,
      );
    }
    createReadStream(abs).pipe(opts.res);
  }

  async softDelete(
    assetId: string,
    user: PublicUser,
  ): Promise<void> {
    const asset = await this.deps.assets.findById(assetId);
    if (!asset) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }
    const isOwner = asset.userId === user.id;
    if (!isOwner && user.role !== 'admin') {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Forbidden');
    }
    const at = this.deps.clock.now();
    await this.deps.assets.softDelete(assetId, at);
    for (const p of [asset.filePath, asset.thumbPath]) {
      try {
        await unlink(resolveUnderDataDir(this.deps.dataDir, p));
      } catch (err) {
        this.deps.logger.warn({ err, path: p }, 'failed to remove asset file');
      }
    }
  }
}

/**
 * Paths come from DB only (never the client). Resolve the same way writeFile
 * would (cwd-relative or absolute), then insist the result stays under DATA_DIR.
 */
function resolveUnderDataDir(dataDir: string, stored: string): string {
  const root = path.resolve(dataDir);
  const abs = path.resolve(stored);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'File not found');
  }
  return abs;
}
