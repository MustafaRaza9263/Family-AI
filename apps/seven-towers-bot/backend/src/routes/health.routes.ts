import { Router } from 'express';
import { isMongoConnected } from '../db/connection';
import type { LlmClient } from '../types/llm';

export function createHealthRoutes(llm: LlmClient): Router {
  const router = Router();

  router.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  router.get('/api/health/ready', async (_req, res) => {
    const mongo = isMongoConnected();
    let llmOk = false;
    try {
      await Promise.race([
        llm.ping().then(() => {
          llmOk = true;
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
        ),
      ]);
    } catch {
      llmOk = false;
    }

    const ready = mongo && llmOk;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: {
        mongo: mongo ? 'ok' : 'down',
        llm: llmOk ? 'ok' : 'down',
      },
    });
  });

  return router;
}
