import type { AssetKind } from '../db/documents.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toAssetDto } from '../mappers/asset.js';

export class LibraryService {
  constructor(private readonly assets: AssetRepository) {}

  async list(
    userId: string,
    opts: { kind?: AssetKind; cursor?: string; limit: number },
  ) {
    const before = opts.cursor ? decodeCursor(opts.cursor) : null;
    if (opts.cursor && !before) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
    }
    const rows = await this.assets.listLibrary({
      userId,
      kind: opts.kind,
      limit: opts.limit + 1,
      before: before
        ? { createdAt: before.at, id: before.id }
        : undefined,
    });
    const page = rows.slice(0, opts.limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toAssetDto),
      nextCursor:
        rows.length > opts.limit && last
          ? encodeCursor(last.createdAt, last.id)
          : null,
    };
  }
}
