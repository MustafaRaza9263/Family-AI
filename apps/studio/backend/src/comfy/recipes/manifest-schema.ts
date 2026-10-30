import { z } from 'zod';

/** Node title + which input keys the backend is allowed to write. */
export const targetSchema = z.object({
  title: z.string().min(1),
  fields: z.array(z.string().min(1)).min(1),
});

export const textParamSchema = z.object({
  type: z.literal('text'),
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
  sizes: sizeSchema.optional(),
});

export const enumParamSchema = z.object({
  type: z.literal('enum'),
  default: z.string().min(1),
  options: z.array(enumOptionSchema).min(1),
  target: targetSchema,
});

export const paramSchema = z.discriminatedUnion('type', [
  textParamSchema,
  enumParamSchema,
]);

export const manifestSchema = z
  .object({
    id: z.string().min(1),
    tool: z.enum(['image', 'video']),
    timeoutSeconds: z.number().int().positive(),
    params: z.record(z.string(), paramSchema),
    seed: z.object({ target: targetSchema }),
    output: z.object({
      title: z.string().min(1),
      prefixField: z.string().min(1),
    }),
  })
  .superRefine((manifest, ctx) => {
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
