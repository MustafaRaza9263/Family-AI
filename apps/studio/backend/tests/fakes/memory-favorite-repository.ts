import type { FavoriteRepository } from '../../src/db/repositories/favorite-repository.js';

type Row = { id: string; userId: string; assetId: string; createdAt: Date };

export class MemoryFavoriteRepository implements FavoriteRepository {
  private readonly rows = new Map<string, Row>();
  private seq = 0;

  private key(userId: string, assetId: string): string {
    return `${userId}:${assetId}`;
  }

  async toggle(userId: string, assetId: string, at: Date): Promise<boolean> {
    const k = this.key(userId, assetId);
    if (this.rows.has(k)) {
      this.rows.delete(k);
      return false;
    }
    this.seq += 1;
    this.rows.set(k, {
      id: `fav_${this.seq}`,
      userId,
      assetId,
      createdAt: at,
    });
    return true;
  }

  async listAssetIds(userId: string): Promise<string[]> {
    return [...this.rows.values()]
      .filter((r) => r.userId === userId)
      .map((r) => r.assetId);
  }

  async hasMany(userId: string, assetIds: string[]): Promise<Set<string>> {
    const allow = new Set(assetIds);
    const out = new Set<string>();
    for (const r of this.rows.values()) {
      if (r.userId === userId && allow.has(r.assetId)) out.add(r.assetId);
    }
    return out;
  }

  async removeByAssetId(assetId: string): Promise<void> {
    for (const [k, r] of this.rows) {
      if (r.assetId === assetId) this.rows.delete(k);
    }
  }
}
