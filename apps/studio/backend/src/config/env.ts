import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
  LOG_LEVEL: z.string().default('info'),
  MONGODB_URI: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default('studio_sid'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  /** Number of proxy hops Express should trust (0 = none). */
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  /** Dev-only browser origin allowed for credentialed CORS. */
  CORS_ORIGIN: z.url().optional(),
  DATA_DIR: z.string().min(1).default('./data'),
  COMFY_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Validate env from an explicit source so tests can inject values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => {
      const key = issue.path[0]?.toString() ?? 'unknown';
      return `${key}: ${issue.message}`;
    });
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  return Object.freeze(parsed.data);
}
