import type { Request, Response, NextFunction } from 'express';
import type { StudioEvent } from '@studio/shared';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { EventHub } from '../events/hub.js';

export function createEventsController(hub: EventHub) {
  return {
    connect(req: Request, res: Response, next: NextFunction): void {
      try {
        if (!req.auth) {
          throw new AppError(
            401,
            ErrorCodes.UNAUTHENTICATED,
            'Authentication required',
          );
        }
        const userId = req.auth.user.id;

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const unsubscribe = hub.subscribe(userId, (event) => {
          if (res.writableEnded) return;
          if (event.type === 'heartbeat') {
            res.write(': ping\n\n');
            return;
          }
          writeEvent(res, event);
        });

        req.on('close', () => {
          unsubscribe();
          if (!res.writableEnded) res.end();
        });
      } catch (err) {
        next(err);
      }
    },
  };
}

function writeEvent(res: Response, event: StudioEvent): void {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
