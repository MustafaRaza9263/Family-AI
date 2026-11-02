import { ObjectId, type Collection, type Db } from 'mongodb';
import type { AssetFavoriteDocument } from '../documents.js';
import type { FavoriteRepository } from './favorite-repository.js';

export class MongoFavoriteRepository implements FavoriteRepository {
  private readonly favorites: Collection<AssetFavoriteDocument>;

  constructor(db: Db) {
    this.favorites = db.collection<AssetFavoriteDocument>('asset_favorites');
  }

  async toggle(userId: string, assetId: string, at: Date): Promise<boolean> {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(assetId)) return false;
    const filter = {
      userId: new ObjectId(userId),
      assetId: new ObjectId(assetId),
    };
    const existing = await this.favorites.findOne(filter);
    if (existing) {
      await this.favorites.deleteOne({ _id: existing._id });
      return false;
    }
    await this.favorites.insertOne({
      _id: new ObjectId(),
      userId: filter.userId,
      assetId: filter.assetId,
      createdAt: at,
    });
    return true;
  }

  async listAssetIds(userId: string): Promise<string[]> {
    if (!ObjectId.isValid(userId)) return [];
    const docs = await this.favorites
      .find({ userId: new ObjectId(userId) })
      .project({ assetId: 1 })
      .toArray();
    return docs.map((d) => d.assetId.toHexString());
  }

  async hasMany(userId: string, assetIds: string[]): Promise<Set<string>> {
    const out = new Set<string>();
    if (!ObjectId.isValid(userId) || assetIds.length === 0) return out;
    const valid = assetIds.filter((id) => ObjectId.isValid(id));
    if (valid.length === 0) return out;
    const docs = await this.favorites
      .find({
        userId: new ObjectId(userId),
        assetId: { $in: valid.map((id) => new ObjectId(id)) },
      })
      .project({ assetId: 1 })
      .toArray();
    for (const d of docs) out.add(d.assetId.toHexString());
    return out;
  }

  async removeByAssetId(assetId: string): Promise<void> {
    if (!ObjectId.isValid(assetId)) return;
    await this.favorites.deleteMany({ assetId: new ObjectId(assetId) });
  }
}
