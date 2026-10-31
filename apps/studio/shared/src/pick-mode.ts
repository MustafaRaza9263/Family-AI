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
 * A variant that does not exist at this count is ignored — fall back to default.
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
    const byVariant = matching.find((m) => m.variant?.id === query.variantId);
    if (byVariant) return byVariant;
  }

  const preferred = matching.find((m) => m.variant?.default === true);
  if (preferred) return preferred;

  // A lone candidate (e.g. Edit / Combine) is the default for that count.
  if (matching.length === 1) return matching[0];

  const plain = matching.find((m) => m.variant === undefined);
  if (plain) return plain;

  return matching[0];
}
