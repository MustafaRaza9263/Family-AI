import { z } from 'zod';
import { assetKindSchema, assetSchema } from './asset.js';

export const libraryQuerySchema = z.object({
  kind: assetKindSchema.optional(),
  source: z.enum(['generated', 'upload']).optional(),
  // Query strings only — never z.coerce.boolean() ('false' would become true).
  favorited: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(24),
});

export const libraryPageSchema = z.object({
  items: z.array(assetSchema),
  nextCursor: z.string().nullable(),
});

export const favoriteToggleResponseSchema = z.object({
  favorited: z.boolean(),
});

export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type LibraryPage = z.infer<typeof libraryPageSchema>;
export type FavoriteToggleResponse = z.infer<
  typeof favoriteToggleResponseSchema
>;
