/** Shared match shape for recipe modes and public capability modes. */
export type ModeMatch = {
  inputImages: { min: number; max: number };
  variant?: { id: string; default?: boolean };
};

export type PickModeQuery = {
  inputImageCount: number;
  variantId?: string;
};

/**
 * Pick the mode that covers this attachment count (and optional variant).
 * Used by the server (authoritative) and the client (to show controls).
 */
export function pickMode<T extends ModeMatch>(
  modes: readonly T[],
  query: PickModeQuery,
): T | undefined {
  const matching = modes.filter(
    (m) =>
      query.inputImageCount >= m.inputImages.min &&
      query.inputImageCount <= m.inputImages.max,
  );
  if (matching.length === 0) return undefined;

  if (query.variantId !== undefined) {
    return matching.find((m) => m.variant?.id === query.variantId);
  }

  const preferred = matching.find((m) => m.variant?.default === true);
  if (preferred) return preferred;

  const plain = matching.find((m) => m.variant === undefined);
  if (plain) return plain;

  return matching[0];
}
