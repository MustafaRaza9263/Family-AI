import type { JobStage } from '@studio/shared';

/** Map Comfy node class → product stage. Never expose class names to clients. */
export function stageFromNodeClass(nodeClass: string): JobStage {
  if (/Sampler/i.test(nodeClass)) return 'generating';
  if (/VAEDecode/i.test(nodeClass) || /^Save/i.test(nodeClass)) {
    return 'finishing';
  }
  return 'preparing';
}
