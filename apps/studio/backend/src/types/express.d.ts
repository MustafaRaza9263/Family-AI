import type { PublicUser } from '@studio/shared';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: PublicUser;
        sessionId: string;
        rawToken: string;
      };
      id?: string;
    }
  }
}

export {};
