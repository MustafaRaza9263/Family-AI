import type { Request, Response, NextFunction } from 'express';
import { createThreadRequestSchema, threadListQuerySchema } from '@studio/shared';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { ThreadService } from '../services/thread.service.js';

export function createThreadsController(service: ThreadService) {
  return {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        const parsed = createThreadRequestSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
          throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid thread input');
        }
        const body = await service.create(
          userId,
          parsed.data.tool,
          parsed.data.title,
        );
        res.status(201).json(body);
      } catch (err) {
        next(err);
      }
    },

    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = requireUserId(req);
        const parsed = threadListQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid query');
        }
        const body = await service.list(
          userId,
          parsed.data.cursor,
          parsed.data.limit,
          parsed.data.tool,
        );
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
