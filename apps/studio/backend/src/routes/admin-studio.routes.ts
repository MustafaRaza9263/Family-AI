import { Router } from 'express';
import {
  adminJobsQuerySchema,
  adminRunsQuerySchema,
  patchEngineRequestSchema,
  patchSettingsRequestSchema,
} from '@studio/shared';
import { z } from 'zod';
import { createAdminStudioController } from '../controllers/admin-studio.controller.js';
import { requireAdmin } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { AdminStudioService } from '../services/admin-studio.service.js';

const jobIdParams = z.object({ jobId: z.string().min(1) });

export function createAdminStudioRoutes(service: AdminStudioService): Router {
  const router = Router();
  const controller = createAdminStudioController(service);

  router.get(
    '/admin/jobs',
    requireAdmin,
    validate(adminJobsQuerySchema, 'query'),
    (req, res, next) => void controller.listJobs(req, res, next),
  );
  router.get(
    '/admin/runs',
    requireAdmin,
    validate(adminRunsQuerySchema, 'query'),
    (req, res, next) => void controller.listRuns(req, res, next),
  );
  router.get(
    '/admin/runs/:jobId',
    requireAdmin,
    validate(jobIdParams, 'params'),
    (req, res, next) => void controller.getRun(req, res, next),
  );
  router.get('/admin/engine', requireAdmin, (req, res, next) =>
    void controller.getEngine(req, res, next),
  );
  router.patch(
    '/admin/engine',
    requireAdmin,
    validate(patchEngineRequestSchema),
    (req, res, next) => void controller.patchEngine(req, res, next),
  );
  router.get('/admin/settings', requireAdmin, (req, res, next) =>
    void controller.getSettings(req, res, next),
  );
  router.patch(
    '/admin/settings',
    requireAdmin,
    validate(patchSettingsRequestSchema),
    (req, res, next) => void controller.patchSettings(req, res, next),
  );

  return router;
}
