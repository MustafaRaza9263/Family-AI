import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { AdminUsersService } from '../services/admin-users.service.js';

export function createAdminUsersController(admin: AdminUsersService) {
  return {
    async list(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const result = await admin.list(req.query as never);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async update(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        if (!req.auth) {
          next(
            new AppError(
              401,
              ErrorCodes.UNAUTHENTICATED,
              'Authentication required',
            ),
          );
          return;
        }
        const user = await admin.setStatus(
          req.auth.user.id,
          String(req.params.id),
          req.body.status,
        );
        res.status(200).json({ user });
      } catch (err) {
        next(err);
      }
    },
  };
}
