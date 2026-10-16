import { promises as fs } from 'fs';
import path from 'path';
import {
  CHARS_PER_TOKEN_ESTIMATE,
  CONTEXT_OVERHEAD_TOKENS,
  MAX_ANSWER_TOKENS,
} from '../config/limits';
import { env } from '../config/env';
import {
  parseKnowledgeMarkdown,
  type ParsedKnowledge,
  type ParsedTable,
} from './knowledge-parse';

export const PROMPT_TOKEN_WARN = 12_000;

export type KnowledgeIssue = {
  severity: 'error' | 'warning';
  message: string;
  line?: number;
};

export type KnowledgeStats = {
  tables: number;
  images: number;
  tokens: number;
};

export type PackValidation = {
  projectId: string;
  ok: boolean;
  errors: KnowledgeIssue[];
  warnings: KnowledgeIssue[];
  stats: KnowledgeStats;
  systemMd: string;
  knowledgeMd: string;
  parsed: ParsedKnowledge;
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function buildSystemPromptText(systemMd: string, knowledgeMd: string): string {
  return `${systemMd.trim()}\n\n# KNOWLEDGE BASE\n${knowledgeMd}`;
}

export function contextRejectTokenLimit(): number {
  return env.LLM_CONTEXT_TOKENS - MAX_ANSWER_TOKENS - CONTEXT_OVERHEAD_TOKENS;
}

export async function validateProjectPack(
  projectId: string,
  rootDir: string,
): Promise<PackValidation> {
  const errors: KnowledgeIssue[] = [];
  const warnings: KnowledgeIssue[] = [];

  const systemPath = path.join(rootDir, 'system.md');
  const knowledgePath = path.join(rootDir, 'knowledge.md');

  let systemMd = '';
  let knowledgeMd = '';

  try {
    systemMd = await fs.readFile(systemPath, 'utf8');
  } catch {
    errors.push({ severity: 'error', message: 'Missing required file system.md' });
  }

  try {
    knowledgeMd = await fs.readFile(knowledgePath, 'utf8');
  } catch {
    errors.push({ severity: 'error', message: 'Missing required file knowledge.md' });
  }

  const parsed =
    knowledgeMd.length > 0
      ? parseKnowledgeMarkdown(knowledgeMd)
      : emptyParsed();

  if (knowledgeMd.length > 0 && !parsed.lastUpdated) {
    errors.push({
      severity: 'error',
      message: 'Missing required "Last updated: YYYY-MM-DD" in the first 10 lines',
      line: 1,
    });
  }

  validateTables(parsed.tables, errors);
  collectImageIssues(parsed, errors, warnings);
  await checkImageFiles(parsed, rootDir, errors);

  const promptText = buildSystemPromptText(systemMd, knowledgeMd);
  const tokens = estimateTokens(promptText);
  const rejectAt = contextRejectTokenLimit();

  if (tokens > rejectAt) {
    errors.push({
      severity: 'error',
      message: `Estimated prompt tokens ${tokens} would be rejected by the context guard (limit ${rejectAt})`,
    });
  } else if (tokens > PROMPT_TOKEN_WARN) {
    warnings.push({
      severity: 'warning',
      message: `Estimated prompt tokens ${tokens} exceed warn threshold ${PROMPT_TOKEN_WARN}`,
    });
  }

  const uniqueTables = new Set(parsed.tables.map((t) => t.id)).size;
  const uniqueImages = new Set(parsed.images.map((i) => i.name)).size;

  return {
    projectId,
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { tables: uniqueTables, images: uniqueImages, tokens },
    systemMd,
    knowledgeMd,
    parsed,
  };
}

function emptyParsed(): ParsedKnowledge {
  return {
    lastUpdated: null,
    lastUpdatedLine: null,
    tables: [],
    images: [],
    invalidImageRefs: [],
  };
}

function validateTables(tables: ParsedTable[], errors: KnowledgeIssue[]): void {
  const seen = new Map<string, number>();
  for (const table of tables) {
    const prev = seen.get(table.id);
    if (prev !== undefined) {
      errors.push({
        severity: 'error',
        message: `Duplicate table id "${table.id}" (first at line ${prev})`,
        line: table.markerLine,
      });
    } else {
      seen.set(table.id, table.markerLine);
    }

    if (!table.hasTable) {
      errors.push({
        severity: 'error',
        message: `Table marker "${table.id}" is not immediately followed by a GFM table`,
        line: table.markerLine,
      });
      continue;
    }

    const expected = table.columns.length;
    for (let r = 0; r < table.rowCellCounts.length; r++) {
      const actual = table.rowCellCounts[r] ?? 0;
      if (actual !== expected) {
        errors.push({
          severity: 'error',
          message: `Table "${table.id}" row has ${actual} cells, expected ${expected}`,
          line: table.rowLines[r],
        });
      }
    }
  }
}

function collectImageIssues(
  parsed: ParsedKnowledge,
  errors: KnowledgeIssue[],
  warnings: KnowledgeIssue[],
): void {
  for (const bad of parsed.invalidImageRefs) {
    errors.push({
      severity: 'error',
      message: `Invalid image name "${bad.raw}" (expected kebab-case.webp)`,
      line: bad.line,
    });
  }

  const seen = new Map<string, number>();
  for (const img of parsed.images) {
    const prev = seen.get(img.name);
    if (prev !== undefined) {
      warnings.push({
        severity: 'warning',
        message: `Image "${img.name}" referenced more than once (first at line ${prev})`,
        line: img.line,
      });
    } else {
      seen.set(img.name, img.line);
    }
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkImageFiles(
  parsed: ParsedKnowledge,
  rootDir: string,
  errors: KnowledgeIssue[],
): Promise<void> {
  const names = [...new Set(parsed.images.map((i) => i.name))];
  for (const name of names) {
    const line = parsed.images.find((i) => i.name === name)?.line;
    const webp = path.join(rootDir, 'images', `${name}.webp`);
    const thumb = path.join(rootDir, 'images', `${name}.thumb.webp`);
    if (!(await fileExists(webp))) {
      errors.push({
        severity: 'error',
        message: `Missing image file images/${name}.webp`,
        line,
      });
    }
    if (!(await fileExists(thumb))) {
      errors.push({
        severity: 'error',
        message: `Missing thumbnail images/${name}.thumb.webp`,
        line,
      });
    }
  }
}

export function formatIssue(issue: KnowledgeIssue): string {
  const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
  const loc = issue.line !== undefined ? `line ${issue.line}: ` : '';
  return `${prefix}: ${loc}${issue.message}`;
}
