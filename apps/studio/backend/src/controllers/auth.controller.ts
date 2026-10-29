import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthController(auth: AuthService) {
  return {
    async register(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const result = await auth.register(req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async login(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const user = await auth.login(req.body, req, res);
        res.status(200).json({ user });
      } catch (err) {
        next(err);
      }
    },

    async logout(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        await auth.logout(req, res);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    me(req: Request, res: Response, next: NextFunction): void {
      if (!req.auth) {
        next(
          new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required'),
        );
        return;
      }
      res.status(200).json({ user: req.auth.user });
    },
  };
}
