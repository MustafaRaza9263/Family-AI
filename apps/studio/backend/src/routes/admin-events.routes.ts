import { Router } from 'express';
import { createAdminEventsController } from '../controllers/admin-events.controller.js';
import type { EventHub } from '../events/hub.js';
import { requireAdmin } from '../middleware/require-auth.js';

export function createAdminEventsRoutes(hub: EventHub): Router {
  const router = Router();
  const controller = createAdminEventsController(hub);
  router.get('/admin/events', requireAdmin, (req, res, next) => {
    controller.connect(req, res, next);
  });
  return router;
}
