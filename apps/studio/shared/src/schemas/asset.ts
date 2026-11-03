import { z } from 'zod';

export const assetKindSchema = z.enum(['image', 'video']);

export const assetSourceSchema = z.enum(['upload', 'generated', 'derived']);

/** Present on library items when an admin lists all users' creations. */
export const assetOwnerSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
});

export const assetSchema = z.object({
  id: z.string().min(1),
  kind: assetKindSchema,
  mime: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSec: z.number().nonnegative().optional(),
  source: assetSourceSchema,
  threadId: z.string().optional(),
  jobId: z.string().optional(),
  parentAssetId: z.string().optional(),
  /** Per-user; false outside library enrichment. */
  favorited: z.boolean().default(false),
  /** Creator; only set for admin library responses. */
  owner: assetOwnerSchema.optional(),
  createdAt: z.string().datetime(),
});

export type AssetOwner = z.infer<typeof assetOwnerSchema>;
export type AssetDto = z.infer<typeof assetSchema>;
