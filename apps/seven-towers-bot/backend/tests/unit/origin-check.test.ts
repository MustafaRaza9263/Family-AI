import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '../../src/middleware/origin-check';

const allowed = [
  'http://localhost:3000',
  'http://spark-beee.local:3000',
  'http://spark-beee.tail811701.ts.net:3000',
] as const;

describe('isAllowedOrigin', () => {
  it('allows same host as the request', () => {
    expect(
      isAllowedOrigin('http://spark-beee.local:4000', 'spark-beee.local:4000', allowed),
    ).toBe(true);
  });

  it('allows exact allowlist match', () => {
    expect(
      isAllowedOrigin('http://spark-beee.tail811701.ts.net:3000', 'localhost:4000', allowed),
    ).toBe(true);
  });

  it('allows same hostname with different scheme or port', () => {
    expect(
      isAllowedOrigin('https://spark-beee.tail811701.ts.net:3000', 'localhost:4000', allowed),
    ).toBe(true);
    expect(
      isAllowedOrigin('http://spark-beee.tail811701.ts.net', 'localhost:4000', allowed),
    ).toBe(true);
    expect(
      isAllowedOrigin('https://spark-beee.tail811701.ts.net', 'localhost:4000', allowed),
    ).toBe(true);
  });

  it('rejects unknown hosts', () => {
    expect(isAllowedOrigin('http://evil.example:3000', 'localhost:4000', allowed)).toBe(false);
  });

  it('rejects malformed origins', () => {
    expect(isAllowedOrigin('not-a-url', 'localhost:4000', allowed)).toBe(false);
  });
});
