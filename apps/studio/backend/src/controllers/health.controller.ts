import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

export function createHealthController(db: Db | null) {
  return {
    async get(_req: Request, res: Response): Promise<void> {
      try {
        if (!db) {
          res.status(503).json({ status: 'ok', db: 'down' });
          return;
        }
        await db.command({ ping: 1 });
        res.status(200).json({ status: 'ok', db: 'up' });
      } catch {
        res.status(503).json({ status: 'ok', db: 'down' });
      }
    },
  };
}
