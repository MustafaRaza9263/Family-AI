import cors from 'cors';
import type { Express, RequestHandler } from 'express';
import helmet from 'helmet';
import type { Env } from '../config/env.js';

export function applySecurity(app: Express, env: Env): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          // Disabled so plain-HTTP LAN / Tailscale still works.
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  if (env.CORS_ORIGIN) {
    app.use(
      cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
      }) as RequestHandler,
    );
  }
}
