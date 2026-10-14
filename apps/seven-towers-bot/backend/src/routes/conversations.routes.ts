import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { requireAuth, requirePasswordChanged } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  conversationsQuerySchema,
  objectIdParamSchema,
} from '../validators/chat.schemas';

export const conversationsRoutes = Router();

conversationsRoutes.get(
  '/api/conversations',
  requireAuth,
  requirePasswordChanged,
  validate(conversationsQuerySchema, 'query'),
  conversationController.listConversations,
);

conversationsRoutes.get(
  '/api/conversations/:id',
  requireAuth,
  requirePasswordChanged,
  validate(objectIdParamSchema, 'params'),
  conversationController.getConversation,
);
