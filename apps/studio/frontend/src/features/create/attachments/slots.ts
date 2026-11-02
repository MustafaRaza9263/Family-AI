/**
 * Slot labels shown in the tray for the slots attachment style.
 * Always show the next empty slot after filled ones (End only after Start).
 */
export function visibleSlotLabels(
  labels: readonly string[],
  filledCount: number,
): string[] {
  if (labels.length === 0) return [];
  if (filledCount <= 0) return [labels[0]!];
  if (filledCount >= labels.length) return [...labels];
  return labels.slice(0, filledCount + 1);
}

/** After removing index `removed`, later filled slots shift up. */
export function shiftAfterRemove<T>(items: readonly T[], removed: number): T[] {
  return items.filter((_, i) => i !== removed);
}
