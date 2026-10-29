import { Router } from 'express';
import {
  adminUpdateUserRequestSchema,
  adminUserListQuerySchema,
} from '@studio/shared';
import { z } from 'zod';
import type { AdminUsersService } from '../services/admin-users.service.js';
import { createAdminUsersController } from '../controllers/admin-users.controller.js';
import { requireAdmin } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';

const idParamsSchema = z.object({
  id: z.string().min(1),
});

export function createAdminRoutes(admin: AdminUsersService): Router {
  const router = Router();
  const controller = createAdminUsersController(admin);

  router.get(
    '/admin/users',
    requireAdmin,
    validate(adminUserListQuerySchema, 'query'),
    (req, res, next) => void controller.list(req, res, next),
  );

  router.patch(
    '/admin/users/:id',
    requireAdmin,
    validate(idParamsSchema, 'params'),
    validate(adminUpdateUserRequestSchema),
    (req, res, next) => void controller.update(req, res, next),
  );

  return router;
}
