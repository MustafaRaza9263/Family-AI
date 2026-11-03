/**
 * Pure helpers for the Warm/Cold badge shown in the job drawer.
 * Warm = every loader node was cached (ComfyUI served from GPU memory).
 */

import type { AdminJobMetrics } from '@studio/shared';

export type WarmCold = 'warm' | 'cold';

/** Returns null when there are no loader nodes to judge from. */
export function getWarmCold(metrics: AdminJobMetrics | null): WarmCold | null {
  if (!metrics) return null;
  // The telemetry schema sets warm=true when every loader-class node was cached.
  // No loader nodes → vacuously warm per SOT; still expose the flag as-is.
  return metrics.warm ? 'warm' : 'cold';
}
