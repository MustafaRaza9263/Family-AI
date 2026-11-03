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
        // Zod validate transforms 'true'|'false' → boolean on req.query.
        const favorited =
          typeof req.query.favorited === 'boolean'
            ? req.query.favorited
            : undefined;
        const cursor =
          typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const limit = Number(req.query.limit ?? 24);
        const body = await service.list(
          { id: req.auth.user.id, role: req.auth.user.role },
          {
            kind,
            source,
            favorited,
            cursor,
            limit,
          },
        );
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async toggleFavorite(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const id = String(req.params.id ?? '');
        const body = await service.toggleFavorite(req.auth.user.id, id);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
