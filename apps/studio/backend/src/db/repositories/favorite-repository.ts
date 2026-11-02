export type FavoriteRecord = {
  id: string;
  userId: string;
  assetId: string;
  createdAt: Date;
};

export interface FavoriteRepository {
  /** Insert if missing; delete if present. Returns the new favorited state. */
  toggle(userId: string, assetId: string, at: Date): Promise<boolean>;
  listAssetIds(userId: string): Promise<string[]>;
  hasMany(userId: string, assetIds: string[]): Promise<Set<string>>;
  removeByAssetId(assetId: string): Promise<void>;
}
