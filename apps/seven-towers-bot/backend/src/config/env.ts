import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  LLM_BASE_URL: z.url(),
  LLM_MODEL: z.string().min(1),
  LLM_API_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  MONGODB_URI_TEST: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_NAME: z.string().min(1).default('sid'),
  DEFAULT_PHONE_REGION: z.string().min(2).default('PK'),
  DEFAULT_PROJECT_ID: z.string().min(1).default('seven-towers'),
  KNOWLEDGE_DIR: z.string().min(1).default('./knowledge'),
  LLM_CONTEXT_TOKENS: z.coerce.number().int().positive().default(32768),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  /** Relative to process.cwd() (backend/). Next export lands in frontend/out. */
  FRONTEND_DIST_DIR: z.string().min(1).default('../frontend/out'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]?.toString() ?? 'unknown';
    process.stderr.write(`${key}: ${issue.message}\n`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
