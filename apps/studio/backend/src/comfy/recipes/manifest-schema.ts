import { z } from 'zod';

/** Node title + which input keys the backend is allowed to write. */
export const targetSchema = z.object({
  title: z.string().min(1),
  fields: z.array(z.string().min(1)).min(1),
});

/** One concrete write into a titled node's input field. */
export const writeSchema = z.object({
  title: z.string().min(1),
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
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
  /** Server-only; normalized to writes at load. Never sent in capabilities. */
  sizes: sizeSchema.optional(),
  /** Server-only; never sent in capabilities. */
  writes: z.array(writeSchema).optional(),
});

export const enumParamSchema = z.object({
  type: z.literal('enum'),
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  group: z.enum(['primary', 'settings']),
  default: z.string().min(1),
  options: z.array(enumOptionSchema).min(1),
  /** Optional when options carry writes or the value only feeds derived. */
  target: targetSchema.optional(),
});

export const paramSchema = z.discriminatedUnion('type', [
  textParamSchema,
  enumParamSchema,
]);

export const derivedRuleSchema = z.object({
  from: z.tuple([z.string().min(1), z.string().min(1)]),
  table: z.record(z.string(), z.array(writeSchema).min(1)),
});

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
  label: z.string().min(1),
  placeholder: z.string().min(1),
  variant: matchVariantSchema.optional(),
});

/** When this image slot is unused, drop these inputs so orphans are not fed. */
export const imageDetachSchema = z.object({
  title: z.string().min(1),
  input: z.string().min(1),
});

export const recipeImageSchema = z.object({
  title: z.string().min(1),
  field: z.string().min(1),
  /** Public slot label (e.g. "Start frame"). */
  label: z.string().min(1).optional(),
  detach: z.array(imageDetachSchema).optional(),
});

export const manifestSchema = z
  .object({
    id: z.string().min(1),
    tool: z.enum(['image', 'video']),
    timeoutSeconds: z.number().int().positive(),
    match: matchSchema,
    params: z.record(z.string(), paramSchema),
    derived: z.array(derivedRuleSchema).optional(),
    seed: z.object({ target: targetSchema }),
    output: z.object({
      title: z.string().min(1),
      prefixField: z.string().min(1),
    }),
    images: z.array(recipeImageSchema).optional(),
  })
  .superRefine((manifest, ctx) => {
    refineManifest(manifest, ctx);
  });

export type RecipeManifest = z.infer<typeof manifestSchema>;
export type ParamTarget = z.infer<typeof targetSchema>;
export type RecipeParam = z.infer<typeof paramSchema>;
export type RecipeMatch = z.infer<typeof matchSchema>;
export type RecipeImage = z.infer<typeof recipeImageSchema>;
export type ManifestWrite = z.infer<typeof writeSchema>;
export type DerivedRule = z.infer<typeof derivedRuleSchema>;

type RefineCtx = z.RefinementCtx;

function refineManifest(
  manifest: z.infer<typeof manifestSchema>,
  ctx: RefineCtx,
): void {
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
  refineParamTargets(manifest, ctx);
  refineImages(manifest, ctx);
}

function refineParamTargets(
  manifest: z.infer<typeof manifestSchema>,
  ctx: RefineCtx,
): void {
  const derivedParams = new Set(
    (manifest.derived ?? []).flatMap((rule) => rule.from),
  );
  for (const [name, param] of Object.entries(manifest.params)) {
    if (param.type !== 'enum' || param.target) continue;
    const hasWrites = param.options.some(
      (o) => (o.writes && o.writes.length > 0) || o.sizes,
    );
    if (!hasWrites && !derivedParams.has(name)) {
      ctx.addIssue({
        code: 'custom',
        path: ['params', name, 'target'],
        message:
          'enum without target needs option writes/sizes or a derived rule',
      });
    }
  }
}

function refineImages(
  manifest: z.infer<typeof manifestSchema>,
  ctx: RefineCtx,
): void {
  const images = manifest.images ?? [];
  const { min, max } = manifest.match.inputImages;
  if (images.length === 0) {
    if (max > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['images'],
        message: `match.inputImages.max is ${max} but images is empty`,
      });
    }
    return;
  }
  if (images.length !== max) {
    ctx.addIssue({
      code: 'custom',
      path: ['images'],
      message: `images.length (${images.length}) must equal inputImages.max (${max})`,
    });
  }
  for (let i = 0; i < images.length; i++) {
    const slot = images[i];
    if (!slot) continue;
    const optional = i >= min;
    if (optional && (!slot.detach || slot.detach.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['images', i, 'detach'],
        message: `optional image slot ${i} (beyond min ${min}) must declare detach`,
      });
    }
    if (!optional && slot.detach && slot.detach.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['images', i, 'detach'],
        message: `required image slot ${i} must not declare detach`,
      });
    }
  }
}
