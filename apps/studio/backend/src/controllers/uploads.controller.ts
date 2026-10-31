import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { UploadService } from '../services/upload.service.js';
import { UPLOAD_MAX_BYTES } from '../uploads/sanitize-image.js';

export function createUploadsController(service: UploadService) {
  return {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const file = req.file;
        if (!file) {
          throw new AppError(
            400,
            ErrorCodes.UPLOAD_INVALID,
            'Expected a single file field named "file"',
          );
        }
        if (file.size > UPLOAD_MAX_BYTES) {
          throw new AppError(
            400,
            ErrorCodes.UPLOAD_TOO_LARGE,
            'Image is too large (max 10 MB)',
          );
        }
        const asset = await service.uploadImage(
          req.auth.user.id,
          file.buffer,
        );
        res.status(201).json({ asset });
      } catch (err) {
        next(err);
      }
    },
  };
}
