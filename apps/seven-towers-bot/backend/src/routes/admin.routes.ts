import { Router } from 'express';
import { createAdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { originCheck } from '../middleware/origin-check';
import { validate } from '../middleware/validate';
import type { KnowledgeStore } from '../services/knowledge.service';
import {
  adminAuditQuerySchema,
  adminIdParamSchema,
  adminResetPasswordBodySchema,
  adminRoleBodySchema,
  adminStatusBodySchema,
  adminUsersQuerySchema,
} from '../validators/admin.schemas';

export function createAdminRoutes(knowledge: KnowledgeStore): Router {
  const router = Router();
  const admin = createAdminController(knowledge);
  const gate = [requireAuth, requireRole('admin')] as const;

  router.get(
    '/api/admin/users',
    ...gate,
    validate(adminUsersQuerySchema, 'query'),
    admin.listUsers,
  );

  router.get(
    '/api/admin/users/:id',
    ...gate,
    validate(adminIdParamSchema, 'params'),
    admin.getUser,
  );

  router.get(
    '/api/admin/users/:id/conversations',
    ...gate,
    validate(adminIdParamSchema, 'params'),
    admin.getUserConversations,
  );

  router.get(
    '/api/admin/conversations/:id',
    ...gate,
    validate(adminIdParamSchema, 'params'),
    admin.getConversation,
  );

  router.patch(
    '/api/admin/users/:id/status',
    ...gate,
    originCheck,
    validate(adminIdParamSchema, 'params'),
    validate(adminStatusBodySchema),
    admin.setStatus,
  );

  router.patch(
    '/api/admin/users/:id/role',
    ...gate,
    originCheck,
    validate(adminIdParamSchema, 'params'),
    validate(adminRoleBodySchema),
    admin.setRole,
  );

  router.post(
    '/api/admin/users/:id/reset-password',
    ...gate,
    originCheck,
    validate(adminIdParamSchema, 'params'),
    validate(adminResetPasswordBodySchema),
    admin.resetPassword,
  );

  router.post(
    '/api/admin/knowledge/reload',
    ...gate,
    originCheck,
    admin.reloadKnowledge,
  );

  router.get(
    '/api/admin/audit',
    ...gate,
    validate(adminAuditQuerySchema, 'query'),
    admin.listAudit,
  );

  return router;
}
