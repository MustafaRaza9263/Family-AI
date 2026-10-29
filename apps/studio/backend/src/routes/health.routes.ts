import { Router } from 'express';
import type { Db } from 'mongodb';
import { createHealthController } from '../controllers/health.controller.js';

export function createHealthRoutes(db: Db | null): Router {
  const router = Router();
  const controller = createHealthController(db);
  router.get('/health', (req, res) => void controller.get(req, res));
  return router;
}
