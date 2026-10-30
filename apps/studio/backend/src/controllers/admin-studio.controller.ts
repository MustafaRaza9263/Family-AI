import type { Request, Response, NextFunction } from 'express';
import type { AdminStudioService } from '../services/admin-studio.service.js';

export function createAdminStudioController(service: AdminStudioService) {
  return {
    async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const cursor =
          typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const limit = Number(req.query.limit ?? 20);
        res.status(200).json(await service.listJobs(cursor, limit));
      } catch (err) {
        next(err);
      }
    },

    async listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const cursor =
          typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const limit = Number(req.query.limit ?? 20);
        res.status(200).json(await service.listRuns(cursor, limit));
      } catch (err) {
        next(err);
      }
    },

    async getRun(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        res.status(200).json(await service.getRun(String(req.params.jobId)));
      } catch (err) {
        next(err);
      }
    },

    async getEngine(
      _req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        res.status(200).json(await service.getEngine());
      } catch (err) {
        next(err);
      }
    },

    async patchEngine(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        res.status(200).json(await service.setEnginePaused(req.body.paused));
      } catch (err) {
        next(err);
      }
    },

    async getSettings(
      _req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        res.status(200).json(await service.getSettings());
      } catch (err) {
        next(err);
      }
    },

    async patchSettings(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        res.status(200).json(await service.patchSettings(req.body.limits));
      } catch (err) {
        next(err);
      }
    },
  };
}
