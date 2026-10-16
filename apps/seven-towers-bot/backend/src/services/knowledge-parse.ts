/**
 * Hand-written parser for knowledge.md.
 * Chosen over remark: the surface we need is tiny (lastUpdated, table markers,
 * GFM tables, image refs) and we must keep line numbers for validation — no
 * extra dependency for that.
 */

export type TableAlign = 'left' | 'center' | 'right';

export type ParsedTable = {
  id: string;
  title: string;
  columns: { key: string; label: string; align: TableAlign }[];
  rows: Record<string, string>[];
  /** Actual cell counts per data row (for mismatch validation). */
  rowCellCounts: number[];
  rowLines: number[];
  notes?: string;
  markerLine: number;
  headerLine: number;
  /** False when the marker was not followed by a GFM table. */
  hasTable: boolean;
};

export type ParsedImageRef = {
  name: string;
  alt: string;
  line: number;
};

export type ParsedKnowledge = {
  lastUpdated: string | null;
  lastUpdatedLine: number | null;
  tables: ParsedTable[];
  images: ParsedImageRef[];
  /** Raw image path targets under images/ that failed the name pattern. */
  invalidImageRefs: { raw: string; line: number }[];
};

const LAST_UPDATED_RE = /^Last updated:\s*(\d{4}-\d{2}-\d{2})\s*$/i;
const TABLE_MARKER_RE = /^<!--\s*table:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*-->\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const ANY_IMAGE_RE = /!\[([^\]]*)\]\(images\/([^)]+)\)/g;
const VALID_IMAGE_PATH_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/;

export function parseKnowledgeMarkdown(source: string): ParsedKnowledge {
  const lines = source.split(/\r?\n/);
  const result: ParsedKnowledge = {
    lastUpdated: null,
    lastUpdatedLine: null,
    tables: [],
    images: [],
    invalidImageRefs: [],
  };

  const scanLimit = Math.min(10, lines.length);
  for (let i = 0; i < scanLimit; i++) {
    const match = LAST_UPDATED_RE.exec(lines[i] ?? '');
    if (match?.[1]) {
      result.lastUpdated = match[1];
      result.lastUpdatedLine = i + 1;
      break;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const marker = TABLE_MARKER_RE.exec(line);
    if (marker?.[1]) {
      const markerLine = i + 1;
      const id = marker[1];
      const title = nearestHeading(lines, i);
      i += 1;
      // Skip one blank line between marker and table if present.
      if (i < lines.length && (lines[i] ?? '').trim() === '') {
        i += 1;
      }
      const tableStart = i;
      if (i >= lines.length || !isTableRow(lines[i] ?? '')) {
        result.tables.push({
          id,
          title,
          columns: [],
          rows: [],
          rowCellCounts: [],
          rowLines: [],
          markerLine,
          headerLine: markerLine,
          hasTable: false,
        });
        continue;
      }
      const parsed = parseGfmTable(lines, tableStart);
      result.tables.push({
        id,
        title,
        columns: parsed.columns,
        rows: parsed.rows,
        rowCellCounts: parsed.rowCellCounts,
        rowLines: parsed.rowLines,
        notes: parsed.notes,
        markerLine,
        headerLine: tableStart + 1,
        hasTable: true,
      });
      i = parsed.nextIndex;
      continue;
    }
    i += 1;
  }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? '';
    ANY_IMAGE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ANY_IMAGE_RE.exec(line)) !== null) {
      const alt = match[1] ?? '';
      const raw = match[2] ?? '';
      const valid = VALID_IMAGE_PATH_RE.exec(raw);
      if (!valid?.[1]) {
        result.invalidImageRefs.push({ raw, line: lineIdx + 1 });
        continue;
      }
      result.images.push({ name: valid[1], alt, line: lineIdx + 1 });
    }
  }

  return result;
}

function nearestHeading(lines: string[], beforeIndex: number): string {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const match = HEADING_RE.exec(lines[i] ?? '');
    if (match?.[2]) {
      return match[2].trim();
    }
  }
  return 'Untitled table';
}

function isTableRow(line: string): boolean {
  return line.trimStart().startsWith('|');
}

function parseGfmTable(
  lines: string[],
  start: number,
): {
  columns: ParsedTable['columns'];
  rows: Record<string, string>[];
  rowCellCounts: number[];
  rowLines: number[];
  notes?: string;
  nextIndex: number;
} {
  const headerCells = splitRow(lines[start] ?? '');
  const sepLine = lines[start + 1] ?? '';
  const aligns = isTableRow(sepLine)
    ? splitRow(sepLine).map(parseAlign)
    : headerCells.map(() => 'left' as TableAlign);

  const columns = headerCells.map((label, index) => ({
    key: String(index),
    label,
    align: aligns[index] ?? 'left',
  }));

  const rows: Record<string, string>[] = [];
  const rowCellCounts: number[] = [];
  const rowLines: number[] = [];
  let i = start + 2;
  while (i < lines.length && isTableRow(lines[i] ?? '')) {
    const cells = splitRow(lines[i] ?? '');
    const row: Record<string, string> = {};
    for (let c = 0; c < headerCells.length; c++) {
      row[String(c)] = cells[c] ?? '';
    }
    rows.push(row);
    rowCellCounts.push(cells.length);
    rowLines.push(i + 1);
    i += 1;
  }

  let notes: string | undefined;
  let j = i;
  while (j < lines.length && (lines[j] ?? '').trim() === '') {
    j += 1;
  }
  if (j < lines.length && (lines[j] ?? '').trimStart().startsWith('>')) {
    const noteLines: string[] = [];
    while (j < lines.length && (lines[j] ?? '').trimStart().startsWith('>')) {
      noteLines.push((lines[j] ?? '').replace(/^\s*>\s?/, ''));
      j += 1;
    }
    notes = noteLines.join('\n').trim();
    i = j;
  }

  return { columns, rows, rowCellCounts, rowLines, notes, nextIndex: i };
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner =
    trimmed.startsWith('|') && trimmed.endsWith('|')
      ? trimmed.slice(1, -1)
      : trimmed.startsWith('|')
        ? trimmed.slice(1)
        : trimmed;
  return inner.split('|').map((cell) => cell.trim());
}

function parseAlign(cell: string): TableAlign {
  const t = cell.trim();
  const left = t.startsWith(':');
  const right = t.endsWith(':');
  if (left && right) {
    return 'center';
  }
  if (right) {
    return 'right';
  }
  return 'left';
}
