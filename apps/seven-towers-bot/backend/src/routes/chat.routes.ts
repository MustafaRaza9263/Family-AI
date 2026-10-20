import { Router } from 'express';
import { createChatController } from '../controllers/chat.controller';
import { requireAuth, requirePasswordChanged } from '../middleware/auth';
import { chatGates } from '../middleware/chat-gates';
import { originCheck } from '../middleware/origin-check';
import {
  chatPerDayLimiter,
  chatPerMinuteLimiter,
} from '../middleware/rate-limiters';
import { validate } from '../middleware/validate';
import type { KnowledgeStore } from '../services/knowledge.service';
import type { LlmClient } from '../types/llm';
import { chatBodySchema } from '../validators/chat.schemas';

export function createChatRoutes(deps: {
  llm: LlmClient;
  knowledge: KnowledgeStore;
}): Router {
  const router = Router();
  const chat = createChatController(deps);

  router.post(
    '/api/chat',
    requireAuth,
    requirePasswordChanged,
    originCheck,
    chatPerMinuteLimiter,
    chatPerDayLimiter,
    chatGates,
    validate(chatBodySchema),
    chat,
  );

  return router;
}
