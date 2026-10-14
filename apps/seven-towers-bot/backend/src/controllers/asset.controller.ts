import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../lib/errors';
import { param } from '../lib/params';
import type { KnowledgeStore } from '../services/knowledge.service';

export function createAssetController(knowledge: KnowledgeStore) {
  return async function getImage(req: Request, res: Response): Promise<void> {
    const projectId = param(req, 'projectId');
    const file = param(req, 'file');
    const wantThumb = req.query.thumb === '1';

    const project = knowledge.getProject(projectId);
    const entry = project.catalog.find(
      (c) => c.type === 'image' && c.file === file,
    );
    if (!entry) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }

    const fileName = wantThumb ? `${entry.file}.thumb.webp` : `${entry.file}.webp`;
    const abs = path.join(project.rootDir, 'assets', 'images', fileName);

    try {
      await fs.access(abs);
    } catch {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Asset not found');
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    createReadStream(abs).pipe(res);
  };
}
