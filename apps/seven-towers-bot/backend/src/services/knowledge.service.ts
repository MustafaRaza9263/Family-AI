import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import type { ParsedTable, TableAlign } from './knowledge-parse';
import {
  formatIssue,
  validateProjectPack,
  type KnowledgeIssue,
  type PackValidation,
} from './knowledge-validate';

export type KnowledgeImage = {
  alt: string;
  url: string;
  thumbUrl: string;
};

export type KnowledgeTable = {
  id: string;
  title: string;
  columns: { key: string; label: string; align: TableAlign }[];
  rows: Record<string, string>[];
  notes?: string;
};

export type ProjectKnowledge = {
  projectId: string;
  systemMd: string;
  knowledgeMd: string;
  lastUpdated: string;
  tables: Map<string, KnowledgeTable>;
  images: Map<string, KnowledgeImage>;
  rootDir: string;
};

export type KnowledgeStore = {
  loadAll(): Promise<void>;
  reload(): Promise<string[]>;
  getProject(projectId: string): ProjectKnowledge;
  listProjectIds(): string[];
};

export function createKnowledgeStore(knowledgeDir = env.KNOWLEDGE_DIR): KnowledgeStore {
  const projects = new Map<string, ProjectKnowledge>();

  async function loadPack(projectId: string, rootDir: string): Promise<ProjectKnowledge> {
    const result = await validateProjectPack(projectId, rootDir);
    if (!result.ok) {
      throw new KnowledgePackError(projectId, result.errors, result.warnings);
    }
    for (const w of result.warnings) {
      logger.warn({ projectId, line: w.line }, w.message);
    }
    return packFromValidation(projectId, rootDir, result);
  }

  async function discoverAndLoad(): Promise<Map<string, ProjectKnowledge>> {
    const abs = path.resolve(knowledgeDir);
    let entries: string[];
    try {
      entries = await fs.readdir(abs);
    } catch (err) {
      throw new Error(`Knowledge dir not readable: ${abs}`, { cause: err });
    }

    const next = new Map<string, ProjectKnowledge>();
    const allErrors: { projectId: string; issues: KnowledgeIssue[] }[] = [];

    for (const name of entries) {
      const rootDir = path.join(abs, name);
      const stat = await fs.stat(rootDir);
      if (!stat.isDirectory()) {
        continue;
      }
      try {
        const pack = await loadPack(name, rootDir);
        next.set(name, pack);
        logger.info(
          {
            projectId: name,
            tables: pack.tables.size,
            images: pack.images.size,
            lastUpdated: pack.lastUpdated,
          },
          'Knowledge pack loaded',
        );
      } catch (err) {
        if (err instanceof KnowledgePackError) {
          allErrors.push({ projectId: name, issues: err.errors });
          continue;
        }
        throw new Error(`Invalid knowledge pack "${name}"`, { cause: err });
      }
    }

    if (allErrors.length > 0) {
      const flat = allErrors.flatMap((e) =>
        e.issues.map((i) => ({ ...i, message: `[${e.projectId}] ${i.message}` })),
      );
      throw new KnowledgePackError('all', flat, []);
    }

    if (next.size === 0) {
      throw new Error(`No knowledge packs found in ${abs}`);
    }

    return next;
  }

  async function loadAll(): Promise<void> {
    const next = await discoverAndLoad();
    projects.clear();
    for (const [id, pack] of next) {
      projects.set(id, pack);
    }
  }

  async function reload(): Promise<string[]> {
    let next: Map<string, ProjectKnowledge>;
    try {
      next = await discoverAndLoad();
    } catch (err) {
      if (err instanceof KnowledgePackError) {
        throw new AppError(422, ErrorCodes.VALIDATION_ERROR, 'Knowledge reload failed', {
          details: {
            errors: err.errors.map(formatIssue),
            warnings: err.warnings.map(formatIssue),
          },
        });
      }
      throw err;
    }

    projects.clear();
    for (const [id, pack] of next) {
      projects.set(id, pack);
    }
    return [...projects.keys()];
  }

  function getProject(projectId: string): ProjectKnowledge {
    const pack = projects.get(projectId);
    if (!pack) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, `Unknown project: ${projectId}`);
    }
    return pack;
  }

  function listProjectIds(): string[] {
    return [...projects.keys()];
  }

  return { loadAll, reload, getProject, listProjectIds };
}

export class KnowledgePackError extends Error {
  readonly errors: KnowledgeIssue[];
  readonly warnings: KnowledgeIssue[];

  constructor(projectId: string, errors: KnowledgeIssue[], warnings: KnowledgeIssue[]) {
    super(
      `Knowledge pack "${projectId}" failed validation:\n${errors.map(formatIssue).join('\n')}`,
    );
    this.name = 'KnowledgePackError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

function packFromValidation(
  projectId: string,
  rootDir: string,
  result: PackValidation,
): ProjectKnowledge {
  const tables = new Map<string, KnowledgeTable>();
  for (const table of result.parsed.tables) {
    if (!table.hasTable) {
      continue;
    }
    if (tables.has(table.id)) {
      continue;
    }
    tables.set(table.id, toKnowledgeTable(table));
  }

  const images = new Map<string, KnowledgeImage>();
  for (const img of result.parsed.images) {
    if (images.has(img.name)) {
      continue;
    }
    const url = `/api/assets/${projectId}/images/${img.name}`;
    images.set(img.name, {
      alt: img.alt,
      url,
      thumbUrl: `${url}?thumb=1`,
    });
  }

  return {
    projectId,
    systemMd: result.systemMd,
    knowledgeMd: result.knowledgeMd,
    lastUpdated: result.parsed.lastUpdated ?? '',
    tables,
    images,
    rootDir,
  };
}

function toKnowledgeTable(table: ParsedTable): KnowledgeTable {
  return {
    id: table.id,
    title: table.title,
    columns: table.columns,
    rows: table.rows,
    notes: table.notes,
  };
}
