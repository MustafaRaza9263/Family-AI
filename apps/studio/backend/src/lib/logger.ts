import pino from 'pino';
import type { Env } from '../config/env.js';

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
      ],
      remove: true,
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
