import { describe, expect, it } from 'vitest';
import { parseNvidiaSmiLine } from '../../src/telemetry/sampler/nvidia-smi.js';

describe('parseNvidiaSmiLine', () => {
  it('parses a normal csv line', () => {
    expect(parseNvidiaSmiLine('45, 120.50, 62')).toEqual({
      gpuUtilPct: 45,
      powerW: 120.5,
      tempC: 62,
    });
  });

  it('turns [N/A] fields into null', () => {
    expect(parseNvidiaSmiLine('[N/A], [N/A], [N/A]')).toEqual({
      gpuUtilPct: null,
      powerW: null,
      tempC: null,
    });
  });

  it('returns null for malformed lines', () => {
    expect(parseNvidiaSmiLine('')).toBeNull();
    expect(parseNvidiaSmiLine('only-one')).toBeNull();
    expect(parseNvidiaSmiLine('a, b')).toBeNull();
  });

  it('nulls unparsable numeric fields but keeps the row', () => {
    expect(parseNvidiaSmiLine('xx, 10, 20')).toEqual({
      gpuUtilPct: null,
      powerW: 10,
      tempC: 20,
    });
  });
});
