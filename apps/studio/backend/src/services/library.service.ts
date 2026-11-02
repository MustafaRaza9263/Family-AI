import type { AssetKind, AssetSource } from '../db/documents.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { FavoriteRepository } from '../db/repositories/favorite-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Clock } from '../lib/clock.js';
import { toAssetDto } from '../mappers/asset.js';

export class LibraryService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly favorites: FavoriteRepository,
    private readonly clock: Clock,
  ) {}

  async list(
    userId: string,
    opts: {
      kind?: AssetKind;
      source?: AssetSource;
      favorited?: boolean;
      cursor?: string;
      limit: number;
    },
  ) {
    const before = opts.cursor ? decodeCursor(opts.cursor) : null;
    if (opts.cursor && !before) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
    }

    let assetIds: string[] | undefined;
    if (opts.favorited === true) {
      assetIds = await this.favorites.listAssetIds(userId);
      if (assetIds.length === 0) {
        return { items: [], nextCursor: null };
      }
    }

    const rows = await this.assets.listLibrary({
      userId,
      kind: opts.kind,
      source: opts.source ?? 'generated',
      assetIds,
      limit: opts.limit + 1,
      before: before
        ? { createdAt: before.at, id: before.id }
        : undefined,
    });
    const page = rows.slice(0, opts.limit);
    const favoritedIds = await this.favorites.hasMany(
      userId,
      page.map((a) => a.id),
    );
    const last = page[page.length - 1];
    return {
      items: page.map((a) =>
        toAssetDto(a, { favorited: favoritedIds.has(a.id) }),
      ),
      nextCursor:
        rows.length > opts.limit && last
          ? encodeCursor(last.createdAt, last.id)
          : null,
    };
  }

  async toggleFavorite(userId: string, assetId: string) {
    const asset = await this.assets.findById(assetId);
    if (!asset || asset.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }
    if (asset.userId !== userId) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Not your asset');
    }
    const favorited = await this.favorites.toggle(
      userId,
      assetId,
      this.clock.now(),
    );
    return { favorited };
  }
}
