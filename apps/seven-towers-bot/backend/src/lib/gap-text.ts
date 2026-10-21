/** Treat gap fields as untrusted: strip controls before store or display. */

export function stripControlChars(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) {
      continue;
    }
    out += ch;
  }
  return out;
}

/** Lowercase, trim, strip punctuation, collapse spaces — used as the unique key. */
export function normalizeGapKey(need: string): string {
  return stripControlChars(need)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeGapField(value: string, maxLen: number): string {
  const cleaned = stripControlChars(value).trim();
  if (cleaned.length <= maxLen) {
    return cleaned;
  }
  return cleaned.slice(0, maxLen);
}
