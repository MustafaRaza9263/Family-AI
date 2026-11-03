import type { Request, Response, NextFunction } from 'express';
import type { AdminStudioService } from '../services/admin-studio.service.js';

export function createAdminStudioController(service: AdminStudioService) {
  return {
    async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        // validate() replaces req.query with the Zod-parsed object.
        res.status(200).json(await service.listJobs(req.query as never));
      } catch (err) {
        next(err);
      }
    },

    async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        res.status(200).json(await service.getJob(String(req.params.id)));
      } catch (err) {
        next(err);
      }
    },

    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const range =
          typeof req.query.range === 'string' ? req.query.range : '24h';
        res.status(200).json(
          await service.getStats(range as '24h' | '7d' | '30d'),
        );
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
