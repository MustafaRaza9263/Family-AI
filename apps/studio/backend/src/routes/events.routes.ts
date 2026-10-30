import { Router } from 'express';
import { createEventsController } from '../controllers/events.controller.js';
import type { EventHub } from '../events/hub.js';
import { requireAuth } from '../middleware/require-auth.js';

export function createEventsRoutes(hub: EventHub): Router {
  const router = Router();
  const controller = createEventsController(hub);
  router.get('/events', requireAuth, (req, res, next) =>
    controller.connect(req, res, next),
  );
  return router;
}
