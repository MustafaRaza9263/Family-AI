import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { FilesService } from '../services/files.service.js';

export function createFilesController(service: FilesService) {
  return {
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        await service.sendFile({
          assetId: String(req.params.assetId),
          user: req.auth.user,
          thumb: req.query.thumb === '1',
          download: req.query.download === '1',
          res,
        });
      } catch (err) {
        next(err);
      }
    },

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        await service.softDelete(String(req.params.id), req.auth.user);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}
