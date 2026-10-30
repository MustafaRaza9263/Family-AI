import { Router } from 'express';
import { z } from 'zod';
import { createFilesController } from '../controllers/files.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { FilesService } from '../services/files.service.js';

const assetIdParams = z.object({ assetId: z.string().min(1) });
const idParams = z.object({ id: z.string().min(1) });

export function createFilesRoutes(files: FilesService): Router {
  const router = Router();
  const controller = createFilesController(files);

  router.get(
    '/files/:assetId',
    requireAuth,
    validate(assetIdParams, 'params'),
    (req, res, next) => void controller.get(req, res, next),
  );
  router.delete(
    '/assets/:id',
    requireAuth,
    validate(idParams, 'params'),
    (req, res, next) => void controller.remove(req, res, next),
  );

  return router;
}
