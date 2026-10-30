import type { NodeTiming, Phases } from './types.js';

/**
 * First matching rule wins. Class names here are provisional — verify them
 * against the real exported ComfyUI graphs when wiring telemetry to jobs.
 */
const PHASE_RULES: ReadonlyArray<{ phase: keyof Phases; match: RegExp }> = [
  { phase: 'loadMs', match: /Loader/i },
  { phase: 'sampleMs', match: /Sampler/i },
  { phase: 'decodeMs', match: /VAEDecode/i },
];

export function phaseForClass(nodeClass: string): keyof Phases {
  for (const rule of PHASE_RULES) {
    if (rule.match.test(nodeClass)) {
      return rule.phase;
    }
  }
  return 'otherMs';
}

export function computePhases(nodes: readonly NodeTiming[]): Phases {
  const phases: Phases = {
    loadMs: 0,
    sampleMs: 0,
    decodeMs: 0,
    otherMs: 0,
  };
  for (const node of nodes) {
    phases[phaseForClass(node.class)] += node.ms;
  }
  return phases;
}
