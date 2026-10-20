import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type RequestHandler } from 'express';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { notFoundHandler } from './error-handler';

/**
 * Serve the Next static export (if present) after API routes.
 * /api/* keeps the JSON 404; other GETs get exported 404.html.
 */
export function mountFrontendStatic(
  app: Express,
  distDirOverride?: string,
): void {
  const distDir = path.resolve(
    process.cwd(),
    distDirOverride ?? env.FRONTEND_DIST_DIR,
  );
  const exists = fs.existsSync(distDir);

  if (!exists) {
    logger.info({ distDir }, 'Frontend dist directory not found');
    app.use(notFoundHandler);
    return;
  }

  logger.info({ distDir }, 'Serving frontend static files');

  app.use(
    express.static(distDir, {
      index: 'index.html',
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  const html404 = path.join(distDir, '404.html');
  const spaFallback: RequestHandler = (req, res, next) => {
    if (req.path.startsWith('/api')) {
      notFoundHandler(req, res, next);
      return;
    }
    if (req.method === 'GET' && fs.existsSync(html404)) {
      res.status(404).type('html').sendFile(html404);
      return;
    }
    notFoundHandler(req, res, next);
  };

  app.use(spaFallback);
}
