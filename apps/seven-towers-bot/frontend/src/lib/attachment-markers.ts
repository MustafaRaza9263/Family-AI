/**
 * Strip internal image-history markers the model sometimes echoes into replies.
 * Keep in sync with backend guardrails/attachment-markers.ts.
 */

/** Whole-line or inline markers, including a surrounding newline when present. */
const LEGACY_MARKER =
  /\n?\[Shown to the user: image\(s\)[^\]]*\]\n?/gi;
const TAG_MARKER = /\n?<images_shown>[^<]*<\/images_shown>\n?/gi;

export function stripAttachmentMarkers(text: string): string {
  return text
    .replace(LEGACY_MARKER, '\n')
    .replace(TAG_MARKER, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
