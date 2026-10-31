import { Router } from 'express';
import multer from 'multer';
import { createUploadsController } from '../controllers/uploads.controller.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { RateLimiters } from '../middleware/rate-limits.js';
import { passthrough } from '../middleware/rate-limits.js';
import type { UploadService } from '../services/upload.service.js';
import { UPLOAD_MAX_BYTES } from '../uploads/sanitize-image.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 },
});

export function createUploadsRoutes(
  service: UploadService,
  limits: RateLimiters | null,
): Router {
  const router = Router();
  const controller = createUploadsController(service);

  router.post(
    '/uploads',
    requireAuth,
    limits?.uploads ?? passthrough,
    (req, res, next) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (!err) {
          next();
          return;
        }
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          next(
            new AppError(
              400,
              ErrorCodes.UPLOAD_TOO_LARGE,
              'Image is too large (max 10 MB)',
            ),
          );
          return;
        }
        next(
          new AppError(
            400,
            ErrorCodes.UPLOAD_INVALID,
            'Invalid upload',
          ),
        );
      });
    },
    (req, res, next) => void controller.create(req, res, next),
  );

  return router;
}
