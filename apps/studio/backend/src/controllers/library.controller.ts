import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { LibraryService } from '../services/library.service.js';
import type { AssetKind, AssetSource } from '../db/documents.js';

export function createLibraryController(service: LibraryService) {
  return {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const kind =
          req.query.kind === 'image' || req.query.kind === 'video'
            ? (req.query.kind as AssetKind)
            : undefined;
        const source =
          req.query.source === 'upload' || req.query.source === 'generated'
            ? (req.query.source as AssetSource)
            : undefined;
        const cursor =
          typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const limit = Number(req.query.limit ?? 24);
        const body = await service.list(req.auth.user.id, {
          kind,
          source,
          cursor,
          limit,
        });
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
