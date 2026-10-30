import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { GenerationQueryService } from '../services/generation-query.service.js';

export function createGenerationsController(service: GenerationQueryService) {
  return {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const auth = requireAuth(req);
        const body = await service.create(
          auth.user.id,
          String(req.params.id),
          req.body,
        );
        res.status(202).json(body);
      } catch (err) {
        next(err);
      }
    },

    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const auth = requireAuth(req);
        const body = await service.get(
          auth.user.id,
          String(req.params.id),
          auth.user.role === 'admin',
        );
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const auth = requireAuth(req);
        await service.cancel(auth.user.id, String(req.params.id));
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}

function requireAuth(req: Request) {
  if (!req.auth) {
    throw new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required');
  }
  return req.auth;
}
