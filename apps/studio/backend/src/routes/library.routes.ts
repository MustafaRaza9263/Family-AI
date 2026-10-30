import { Router } from 'express';
import { libraryQuerySchema } from '@studio/shared';
import { createLibraryController } from '../controllers/library.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { LibraryService } from '../services/library.service.js';

export function createLibraryRoutes(library: LibraryService): Router {
  const router = Router();
  const controller = createLibraryController(library);
  router.get(
    '/library',
    requireAuth,
    validate(libraryQuerySchema, 'query'),
    (req, res, next) => void controller.list(req, res, next),
  );
  return router;
}
