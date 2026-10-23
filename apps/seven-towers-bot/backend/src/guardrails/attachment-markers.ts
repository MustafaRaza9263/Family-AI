/**
 * History markers tell the model which images the UI already showed.
 * They must never appear in user-facing reply text.
 */

/** Whole-line or inline markers, including a surrounding newline when present. */
const LEGACY_MARKER =
  /\n?\[Shown to the user: image\(s\)[^\]]*\]\n?/gi;
const TAG_MARKER = /\n?<images_shown>[^<]*<\/images_shown>\n?/gi;

/** Remove leaked attachment markers from model (or stored) text. */
export function stripAttachmentMarkers(text: string): string {
  return text
    .replace(LEGACY_MARKER, '\n')
    .replace(TAG_MARKER, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Compact marker appended to assistant history for the LLM only. */
export function imagesShownMarker(ids: string[]): string {
  if (ids.length === 0) {
    return '';
  }
  return `\n<images_shown>${ids.join(', ')}</images_shown>`;
}
