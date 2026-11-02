import { Router } from 'express';
import { libraryQuerySchema } from '@studio/shared';
import { z } from 'zod';
import { createLibraryController } from '../controllers/library.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { LibraryService } from '../services/library.service.js';

const idParams = z.object({ id: z.string().min(1) });

export function createLibraryRoutes(library: LibraryService): Router {
  const router = Router();
  const controller = createLibraryController(library);
  router.get(
    '/library',
    requireAuth,
    validate(libraryQuerySchema, 'query'),
    (req, res, next) => void controller.list(req, res, next),
  );
  router.post(
    '/assets/:id/favorite',
    requireAuth,
    validate(idParams, 'params'),
    (req, res, next) => void controller.toggleFavorite(req, res, next),
  );
  return router;
}
