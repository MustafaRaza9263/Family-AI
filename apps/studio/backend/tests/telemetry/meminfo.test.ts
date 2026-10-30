import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseMeminfo } from '../../src/telemetry/sampler/meminfo.js';

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'fixtures/meminfo.txt'),
  'utf8',
);

describe('parseMeminfo', () => {
  it('computes used and swap from a real /proc/meminfo sample', () => {
    const reading = parseMeminfo(fixture);
    expect(reading).not.toBeNull();
    // MemTotal 131586412 − MemAvailable 65536000 = 66050412 kB
    expect(reading?.memUsedMb).toBeCloseTo(66050412 / 1024, 5);
    expect(reading?.memAvailableMb).toBeCloseTo(65536000 / 1024, 5);
    expect(reading?.memTotalMb).toBeCloseTo(131586412 / 1024, 5);
    // SwapTotal 8388608 − SwapFree 7340032 = 1048576 kB = 1024 MiB
    expect(reading?.swapUsedMb).toBeCloseTo(1024, 5);
  });

  it('returns null when required fields are missing', () => {
    expect(parseMeminfo('SwapTotal: 1 kB\n')).toBeNull();
  });
});
