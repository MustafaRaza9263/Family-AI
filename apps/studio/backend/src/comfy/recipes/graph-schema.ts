import { z } from 'zod';

/** ComfyUI "Export (API)" node shape. Node ids are opaque strings. */
export const graphNodeSchema = z.object({
  class_type: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
  _meta: z
    .object({
      title: z.string().optional(),
    })
    .optional(),
});

export const graphSchema = z.record(z.string(), graphNodeSchema);

export type ApiGraph = z.infer<typeof graphSchema>;
export type ApiGraphNode = z.infer<typeof graphNodeSchema>;
