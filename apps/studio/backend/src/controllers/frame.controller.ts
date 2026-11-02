import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { FrameService } from '../services/frame.service.js';

export function createFrameController(service: FrameService) {
  return {
    async extract(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const body = await service.extract(
          req.auth.user.id,
          String(req.params.id),
          req.body,
        );
        res.status(201).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
