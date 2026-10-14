import { Router } from 'express';
import { createAssetController } from '../controllers/asset.controller';
import { requireAuth, requirePasswordChanged } from '../middleware/auth';
import type { KnowledgeStore } from '../services/knowledge.service';

export function createAssetsRoutes(knowledge: KnowledgeStore): Router {
  const router = Router();
  const getImage = createAssetController(knowledge);

  router.get(
    '/api/assets/:projectId/images/:file',
    requireAuth,
    requirePasswordChanged,
    getImage,
  );

  return router;
}
