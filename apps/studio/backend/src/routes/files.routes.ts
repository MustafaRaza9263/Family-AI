import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { createFilesController } from '../controllers/files.controller.js';
import { createFrameController } from '../controllers/frame.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { FilesService } from '../services/files.service.js';
import type { FrameService } from '../services/frame.service.js';

const assetIdParams = z.object({ assetId: z.string().min(1) });
const idParams = z.object({ id: z.string().min(1) });

export function createFilesRoutes(
  files: FilesService,
  frame: FrameService,
  frameRateLimit: RequestHandler,
): Router {
  const router = Router();
  const controller = createFilesController(files);
  const frames = createFrameController(frame);

  router.get(
    '/files/:assetId',
    requireAuth,
    validate(assetIdParams, 'params'),
    (req, res, next) => void controller.get(req, res, next),
  );
  router.post(
    '/assets/:id/frame',
    requireAuth,
    frameRateLimit,
    validate(idParams, 'params'),
    (req, res, next) => void frames.extract(req, res, next),
  );
  router.delete(
    '/assets/:id',
    requireAuth,
    validate(idParams, 'params'),
    (req, res, next) => void controller.remove(req, res, next),
  );

  return router;
}
