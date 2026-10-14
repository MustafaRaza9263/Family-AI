import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    time: new Date().toISOString(),
  });
});
