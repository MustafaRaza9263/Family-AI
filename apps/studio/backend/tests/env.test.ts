import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

describe('loadEnv', () => {
  it('accepts a valid env object', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: '4001',
      LOG_LEVEL: 'info',
      MONGODB_URI: 'mongodb://mongoadmin:test@127.0.0.1:27017/studio?authSource=admin',
      SESSION_COOKIE_NAME: 'studio_sid',
      SESSION_TTL_DAYS: '14',
      TRUST_PROXY: '0',
      DATA_DIR: './data',
    });
    expect(env.PORT).toBe(4001);
    expect(env.SESSION_COOKIE_NAME).toBe('studio_sid');
  });

  it('throws a clear error when required fields are missing', () => {
    expect(() => loadEnv({ NODE_ENV: 'test' })).toThrow(/Invalid environment/);
  });
});
