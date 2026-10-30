import { Router } from 'express';
import { createCapabilitiesController } from '../controllers/capabilities.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { CapabilitiesService } from '../services/capabilities.service.js';

export function createCapabilitiesRoutes(
  service: CapabilitiesService,
): Router {
  const router = Router();
  const controller = createCapabilitiesController(service);
  router.get('/capabilities', requireAuth, (req, res, next) =>
    void controller.get(req, res, next),
  );
  return router;
}
