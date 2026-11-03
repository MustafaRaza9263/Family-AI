import type { AssetKind, AssetSource } from '../db/documents.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { FavoriteRepository } from '../db/repositories/favorite-repository.js';
import type { UserRepository } from '../db/repositories/user-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Clock } from '../lib/clock.js';
import { toAssetDto } from '../mappers/asset.js';

export class LibraryService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly favorites: FavoriteRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async list(
    user: { id: string; role: 'user' | 'admin' },
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

    const isAdmin = user.role === 'admin';

    let assetIds: string[] | undefined;
    if (opts.favorited === true) {
      assetIds = await this.favorites.listAssetIds(user.id);
      if (assetIds.length === 0) {
        return { items: [], nextCursor: null };
      }
    }

    const rows = await this.assets.listLibrary({
      // Admins see every user's generations; staff see only their own.
      userId: isAdmin ? undefined : user.id,
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
      user.id,
      page.map((a) => a.id),
    );

    const ownersById = new Map<
      string,
      { id: string; fullName: string; email: string }
    >();
    if (isAdmin && page.length > 0) {
      const owners = await this.users.findByIds([
        ...new Set(page.map((a) => a.userId)),
      ]);
      for (const o of owners) {
        ownersById.set(o.id, {
          id: o.id,
          fullName: o.fullName,
          email: o.email,
        });
      }
    }

    const last = page[page.length - 1];
    return {
      items: page.map((a) =>
        toAssetDto(a, {
          favorited: favoritedIds.has(a.id),
          owner: isAdmin
            ? (ownersById.get(a.userId) ?? {
                id: a.userId,
                fullName: 'Unknown',
                email: 'unknown@invalid.local',
              })
            : undefined,
        }),
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
