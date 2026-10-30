/** Opaque pagination cursor: `${isoMs}_${id}` encoded as base64url. */

export type CursorParts = {
  at: Date;
  id: string;
};

export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}_${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorParts | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = raw.lastIndexOf('_');
    if (sep <= 0) return null;
    const iso = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    const at = new Date(iso);
    if (!id || Number.isNaN(at.getTime())) return null;
    return { at, id };
  } catch {
    return null;
  }
}
