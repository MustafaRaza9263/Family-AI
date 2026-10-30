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
  /** ComfyUI HTTP base; WebSocket uses the same host with /ws. */
  COMFY_URL: z.url().default('http://127.0.0.1:8188'),
  /** Folder of recipe subfolders (manifest.json + workflow.api.json). */
  RECIPES_DIR: z.string().min(1).default('./recipes'),
  /**
   * Explicit enum — z.coerce.boolean() treats the string "false" as true.
   */
  TELEMETRY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  TELEMETRY_SAMPLE_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  TELEMETRY_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  /** IANA timezone for usage_daily day keys (YYYY-MM-DD). */
  STUDIO_TIMEZONE: z.string().min(1).default('UTC'),
  RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  ENGINE_PING_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
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
