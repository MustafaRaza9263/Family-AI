import type { NextFunction, Request, Response } from 'express';
import { MAX_IN_FLIGHT_CHATS } from '../config/limits';
import { AppError, ErrorCodes } from '../lib/errors';

let inFlight = 0;
const streamingUsers = new Set<string>();

/** Abort controllers for active chat streams — used on graceful shutdown. */
export const activeChatAborts = new Set<AbortController>();

export function abortAllChats(): void {
  for (const controller of activeChatAborts) {
    controller.abort();
  }
  activeChatAborts.clear();
}

/**
 * Global concurrency cap + one active stream per user.
 * Release exactly once when the response closes.
 */
export function chatGates(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  if (!userId) {
    next(new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required'));
    return;
  }

  if (inFlight >= MAX_IN_FLIGHT_CHATS) {
    next(
      new AppError(503, ErrorCodes.BUSY, 'Server is busy', {
        headers: { 'Retry-After': '5' },
      }),
    );
    return;
  }

  if (streamingUsers.has(userId)) {
    next(
      new AppError(429, ErrorCodes.ALREADY_STREAMING, 'A chat stream is already active'),
    );
    return;
  }

  inFlight += 1;
  streamingUsers.add(userId);
  let released = false;

  const release = (): void => {
    if (released) {
      return;
    }
    released = true;
    inFlight = Math.max(0, inFlight - 1);
    streamingUsers.delete(userId);
  };

  res.on('finish', release);
  res.on('close', release);
  next();
}
