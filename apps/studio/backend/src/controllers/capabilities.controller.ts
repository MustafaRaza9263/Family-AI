import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { CapabilitiesService } from '../services/capabilities.service.js';

export function createCapabilitiesController(service: CapabilitiesService) {
  return {
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const body = await service.getForUser(req.auth.user.id);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
