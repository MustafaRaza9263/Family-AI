import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express, type RequestHandler } from 'express';
import type { Logger } from '../lib/logger.js';
import { notFoundHandler } from './not-found.js';

/**
 * Serve the Next static export after API routes.
 * /api/* keeps JSON 404; other missing pages use trailingSlash HTML or 404.html.
 */
export function mountFrontendStatic(
  app: Express,
  distDir: string,
  logger: Logger,
): void {
  if (!existsSync(distDir)) {
    logger.info({ distDir }, 'Frontend dist directory not found');
    app.use(notFoundHandler);
    return;
  }

  logger.info({ distDir }, 'Serving frontend static files');

  app.use(
    express.static(distDir, {
      index: 'index.html',
      redirect: false,
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
  const pageFallback: RequestHandler = (req, res, next) => {
    if (req.path.startsWith('/api')) {
      notFoundHandler(req, res, next);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      notFoundHandler(req, res, next);
      return;
    }

    // Next export with trailingSlash: /create/ → create/index.html
    const trimmed = req.path.replace(/\/+$/, '') || '';
    const candidates = [
      path.join(distDir, trimmed, 'index.html'),
      path.join(distDir, `${trimmed}.html`),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        res.status(200).type('html').sendFile(candidate);
        return;
      }
    }

    if (existsSync(html404)) {
      res.status(404).type('html').sendFile(html404);
      return;
    }
    notFoundHandler(req, res, next);
  };

  app.use(pageFallback);
}
