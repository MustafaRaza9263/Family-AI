import { z } from 'zod';

export const assetKindSchema = z.enum(['image', 'video']);

export const assetSchema = z.object({
  id: z.string().min(1),
  kind: assetKindSchema,
  mime: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSec: z.number().nonnegative().optional(),
  source: z.enum(['upload', 'generated']),
  threadId: z.string().optional(),
  jobId: z.string().optional(),
  parentAssetId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type AssetDto = z.infer<typeof assetSchema>;
