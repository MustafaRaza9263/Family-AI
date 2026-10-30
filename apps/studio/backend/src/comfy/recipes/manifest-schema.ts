import { z } from 'zod';

/** Node title + which input keys the backend is allowed to write. */
export const targetSchema = z.object({
  title: z.string().min(1),
  fields: z.array(z.string().min(1)).min(1),
});

export const textParamSchema = z.object({
  type: z.literal('text'),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  group: z.enum(['primary', 'settings']),
  maxLength: z.number().int().positive(),
  target: targetSchema,
});

export const sizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const enumOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  /** Server-only; never sent in capabilities. */
  sizes: sizeSchema.optional(),
});

export const enumParamSchema = z.object({
  type: z.literal('enum'),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  group: z.enum(['primary', 'settings']),
  default: z.string().min(1),
  options: z.array(enumOptionSchema).min(1),
  target: targetSchema,
});

export const paramSchema = z.discriminatedUnion('type', [
  textParamSchema,
  enumParamSchema,
]);

export const matchVariantSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  default: z.boolean().optional(),
});

export const matchSchema = z.object({
  tool: z.enum(['image', 'video']),
  inputImages: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    })
    .refine((r) => r.max >= r.min, {
      message: 'inputImages.max must be >= min',
    }),
  variant: matchVariantSchema.optional(),
});

export const manifestSchema = z
  .object({
    id: z.string().min(1),
    tool: z.enum(['image', 'video']),
    timeoutSeconds: z.number().int().positive(),
    match: matchSchema,
    params: z.record(z.string(), paramSchema),
    seed: z.object({ target: targetSchema }),
    output: z.object({
      title: z.string().min(1),
      prefixField: z.string().min(1),
    }),
  })
  .superRefine((manifest, ctx) => {
    if (manifest.match.tool !== manifest.tool) {
      ctx.addIssue({
        code: 'custom',
        path: ['match', 'tool'],
        message: `match.tool must equal tool (${manifest.tool})`,
      });
    }
    for (const [name, param] of Object.entries(manifest.params)) {
      if (param.type !== 'enum') continue;
      if (!param.options.some((opt) => opt.value === param.default)) {
        ctx.addIssue({
          code: 'custom',
          path: ['params', name, 'default'],
          message: `default "${param.default}" is not in options`,
        });
      }
    }
  });

export type RecipeManifest = z.infer<typeof manifestSchema>;
export type ParamTarget = z.infer<typeof targetSchema>;
export type RecipeParam = z.infer<typeof paramSchema>;
export type RecipeMatch = z.infer<typeof matchSchema>;
