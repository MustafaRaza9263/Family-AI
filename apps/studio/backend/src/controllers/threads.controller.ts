import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { ThreadService } from '../services/thread.service.js';

export function createThreadsController(service: ThreadService) {
  return {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        const title =
          typeof req.body?.title === 'string' ? req.body.title : undefined;
        const body = await service.create(userId, title);
        res.status(201).json(body);
      } catch (err) {
        next(err);
      }
    },

    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        const cursor =
          typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const limit = Number(req.query.limit ?? 20);
        const body = await service.list(userId, cursor, limit);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        const body = await service.getDetail(userId, String(req.params.id));
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        await service.softDelete(userId, String(req.params.id));
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}

function requireUserId(req: Request): string {
  if (!req.auth) {
    throw new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required');
  }
  return req.auth.user.id;
}
