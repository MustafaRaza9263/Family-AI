import { Router } from 'express';
import { z } from 'zod';
import { createGenerationsController } from '../controllers/generations.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { GenerationQueryService } from '../services/generation-query.service.js';

const idParamsSchema = z.object({ id: z.string().min(1) });

export function createGenerationsRoutes(
  generations: GenerationQueryService,
): Router {
  const router = Router();
  const controller = createGenerationsController(generations);

  router.get(
    '/generations/:id',
    requireAuth,
    validate(idParamsSchema, 'params'),
    (req, res, next) => void controller.get(req, res, next),
  );
  router.delete(
    '/generations/:id',
    requireAuth,
    validate(idParamsSchema, 'params'),
    (req, res, next) => void controller.cancel(req, res, next),
  );

  return router;
}
