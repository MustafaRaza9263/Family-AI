import { Router } from 'express';
import {
  createGenerationRequestSchema,
  createThreadRequestSchema,
  threadListQuerySchema,
} from '@studio/shared';
import { z } from 'zod';
import { createThreadsController } from '../controllers/threads.controller.js';
import { createGenerationsController } from '../controllers/generations.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { RateLimiters } from '../middleware/rate-limits.js';
import { passthrough } from '../middleware/rate-limits.js';
import type { ThreadService } from '../services/thread.service.js';
import type { GenerationQueryService } from '../services/generation-query.service.js';

const idParamsSchema = z.object({ id: z.string().min(1) });

export function createThreadsRoutes(
  threads: ThreadService,
  generations: GenerationQueryService,
  limits: RateLimiters | null,
): Router {
  const router = Router();
  const threadsCtrl = createThreadsController(threads);
  const gensCtrl = createGenerationsController(generations);
  const genLimit = limits?.generations ?? passthrough;

  router.post(
    '/threads',
    requireAuth,
    validate(createThreadRequestSchema),
    (req, res, next) => void threadsCtrl.create(req, res, next),
  );
  router.get(
    '/threads',
    requireAuth,
    validate(threadListQuerySchema, 'query'),
    (req, res, next) => void threadsCtrl.list(req, res, next),
  );
  router.get(
    '/threads/:id',
    requireAuth,
    validate(idParamsSchema, 'params'),
    (req, res, next) => void threadsCtrl.get(req, res, next),
  );
  router.delete(
    '/threads/:id',
    requireAuth,
    validate(idParamsSchema, 'params'),
    (req, res, next) => void threadsCtrl.remove(req, res, next),
  );
  router.post(
    '/threads/:id/generations',
    requireAuth,
    genLimit,
    validate(idParamsSchema, 'params'),
    validate(createGenerationRequestSchema),
    (req, res, next) => void gensCtrl.create(req, res, next),
  );

  return router;
}
