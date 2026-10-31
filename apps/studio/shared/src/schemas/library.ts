import { z } from 'zod';
import { assetKindSchema, assetSchema } from './asset.js';

export const libraryQuerySchema = z.object({
  kind: assetKindSchema.optional(),
  source: z.enum(['generated', 'upload']).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(24),
});

export const libraryPageSchema = z.object({
  items: z.array(assetSchema),
  nextCursor: z.string().nullable(),
});

export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type LibraryPage = z.infer<typeof libraryPageSchema>;
