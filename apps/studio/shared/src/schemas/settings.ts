import { z } from 'zod';

export const limitsOverridesSchema = z
  .object({
    dailyRuns: z
      .object({
        image: z.number().int().positive().optional(),
        video: z.number().int().positive().optional(),
      })
      .optional(),
    perUserRunning: z.number().int().positive().optional(),
    perUserQueued: z.number().int().positive().optional(),
    globalQueued: z.number().int().positive().optional(),
  })
  .strict();

export const settingsSchema = z.object({
  enginePaused: z.boolean(),
  limits: limitsOverridesSchema,
});

export const patchSettingsRequestSchema = z
  .object({
    limits: limitsOverridesSchema,
  })
  .strict();

export const engineSchema = z.object({
  paused: z.boolean(),
});

export const patchEngineRequestSchema = z
  .object({
    paused: z.boolean(),
  })
  .strict();

export type LimitsOverridesDto = z.infer<typeof limitsOverridesSchema>;
export type SettingsDto = z.infer<typeof settingsSchema>;
export type PatchSettingsRequest = z.infer<typeof patchSettingsRequestSchema>;
export type EngineDto = z.infer<typeof engineSchema>;
export type PatchEngineRequest = z.infer<typeof patchEngineRequestSchema>;
