import { z } from 'zod';
import { engineStateSchema } from './events.js';

export const controlGroupSchema = z.enum(['primary', 'settings']);

export const controlOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
});

export const modeControlSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'enum']),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  group: controlGroupSchema,
  default: z.union([z.string(), z.number(), z.boolean()]),
  options: z.array(controlOptionSchema).optional(),
  maxLength: z.number().int().positive().optional(),
});

export const modeVariantSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  default: z.boolean().optional(),
});

export const toolModeSchema = z.object({
  inputImages: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  }),
  /** Mode name shown in the composer chip (Create / Edit / Combine). */
  label: z.string().min(1),
  placeholder: z.string().min(1),
  variant: modeVariantSchema.optional(),
  controls: z.array(modeControlSchema),
});

export const toolCapabilitySchema = z.object({
  id: z.enum(['image', 'video']),
  label: z.string().min(1),
  attachments: z.object({
    max: z.number().int().nonnegative(),
  }),
  modes: z.array(toolModeSchema),
});

export const toolQuotaSchema = z.object({
  dailyRuns: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});

export const capabilitiesResponseSchema = z.object({
  product: z.string().min(1),
  engine: z.object({ state: engineStateSchema }),
  tools: z.array(toolCapabilitySchema),
  limits: z.object({
    image: toolQuotaSchema,
    video: toolQuotaSchema,
    activeCap: z.object({
      running: z.number().int().nonnegative(),
      queued: z.number().int().nonnegative(),
    }),
  }),
});

export type ModeControl = z.infer<typeof modeControlSchema>;
export type ToolMode = z.infer<typeof toolModeSchema>;
export type ToolCapability = z.infer<typeof toolCapabilitySchema>;
export type CapabilitiesResponse = z.infer<typeof capabilitiesResponseSchema>;
