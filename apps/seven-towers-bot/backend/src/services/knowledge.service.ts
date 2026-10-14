import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';

const catalogEntrySchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
  type: z.enum(['image', 'table']),
  title: z.string().min(1),
  tags: z.array(z.string()),
  file: z.string().min(1),
});

const pricesSchema = z.object({
  updatedAt: z.string().min(1),
  currency: z.string().min(1),
  items: z.array(z.record(z.string(), z.unknown())),
});

const tableColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const tableFileSchema = z.object({
  title: z.string().min(1),
  columns: z.array(tableColumnSchema).min(1),
  rows: z.array(z.record(z.string(), z.unknown())),
  notes: z.string().optional(),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type Prices = z.infer<typeof pricesSchema>;
export type TableData = z.infer<typeof tableFileSchema>;

export type ProjectKnowledge = {
  projectId: string;
  document: string;
  prices: Prices;
  catalog: CatalogEntry[];
  tables: Map<string, TableData>;
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
    const document = await fs.readFile(path.join(rootDir, 'document.md'), 'utf8');
    const pricesRaw = JSON.parse(
      await fs.readFile(path.join(rootDir, 'prices.json'), 'utf8'),
    ) as unknown;
    const catalogRaw = JSON.parse(
      await fs.readFile(path.join(rootDir, 'catalog.json'), 'utf8'),
    ) as unknown;

    const prices = pricesSchema.parse(pricesRaw);
    const catalog = z.array(catalogEntrySchema).parse(catalogRaw);

    const ids = new Set<string>();
    for (const entry of catalog) {
      if (ids.has(entry.id)) {
        throw new Error(`Duplicate catalog id "${entry.id}" in ${projectId}`);
      }
      ids.add(entry.id);
    }

    const tables = new Map<string, TableData>();

    for (const entry of catalog) {
      if (entry.type === 'image') {
        const imagePath = path.join(rootDir, 'assets', 'images', `${entry.file}.webp`);
        const thumbPath = path.join(
          rootDir,
          'assets',
          'images',
          `${entry.file}.thumb.webp`,
        );
        await assertFile(imagePath, `image ${entry.id}`);
        await assertFile(thumbPath, `thumb for ${entry.id}`);
      } else {
        const tablePath = path.join(rootDir, 'assets', 'tables', entry.file);
        await assertFile(tablePath, `table ${entry.id}`);
        const tableRaw = JSON.parse(await fs.readFile(tablePath, 'utf8')) as unknown;
        const table = tableFileSchema.parse(tableRaw);
        const keys = new Set(table.columns.map((c) => c.key));
        for (const row of table.rows) {
          for (const key of Object.keys(row)) {
            if (!keys.has(key)) {
              throw new Error(
                `Table ${entry.id} row has undeclared column key "${key}"`,
              );
            }
          }
        }
        tables.set(entry.id, table);
      }
    }

    return { projectId, document, prices, catalog, tables, rootDir };
  }

  async function loadAll(): Promise<void> {
    const abs = path.resolve(knowledgeDir);
    let entries: string[];
    try {
      entries = await fs.readdir(abs);
    } catch (err) {
      throw new Error(`Knowledge dir not readable: ${abs}`, { cause: err });
    }

    projects.clear();
    for (const name of entries) {
      const rootDir = path.join(abs, name);
      const stat = await fs.stat(rootDir);
      if (!stat.isDirectory()) {
        continue;
      }
      try {
        const pack = await loadPack(name, rootDir);
        projects.set(name, pack);
        logger.info({ projectId: name, catalogSize: pack.catalog.length }, 'Knowledge pack loaded');
      } catch (err) {
        throw new Error(`Invalid knowledge pack "${name}"`, { cause: err });
      }
    }

    if (projects.size === 0) {
      throw new Error(`No knowledge packs found in ${abs}`);
    }
  }

  async function reload(): Promise<string[]> {
    await loadAll();
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

async function assertFile(filePath: string, label: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing file for ${label}: ${filePath}`);
  }
}
