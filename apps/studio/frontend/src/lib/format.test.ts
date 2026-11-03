import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDurationMs,
  formatMbAsGb,
  formatPercent,
  formatWatts,
} from './format';

describe('formatDurationMs', () => {
  it('shows ms under 1 second', () => {
    expect(formatDurationMs(0)).toBe('0ms');
    expect(formatDurationMs(500)).toBe('500ms');
    expect(formatDurationMs(999)).toBe('999ms');
  });

  it('shows seconds between 1s and 60s', () => {
    expect(formatDurationMs(1000)).toBe('1.0s');
    expect(formatDurationMs(4200)).toBe('4.2s');
    expect(formatDurationMs(59_999)).toBe('60.0s');
  });

  it('shows minutes and seconds at 60s+', () => {
    expect(formatDurationMs(60_000)).toBe('1m 0s');
    expect(formatDurationMs(124_000)).toBe('2m 4s');
    expect(formatDurationMs(3_661_000)).toBe('61m 1s');
  });
});

describe('formatMbAsGb', () => {
  it('converts MB to GB with 1 decimal', () => {
    expect(formatMbAsGb(1024)).toBe('1.0 GB');
    expect(formatMbAsGb(3276.8)).toBe('3.2 GB');
  });
});

describe('formatWatts', () => {
  it('rounds to nearest watt', () => {
    expect(formatWatts(145.6)).toBe('146 W');
    expect(formatWatts(0)).toBe('0 W');
  });
});

describe('formatPercent', () => {
  it('defaults to 0 decimal places', () => {
    expect(formatPercent(67.4)).toBe('67%');
    expect(formatPercent(100)).toBe('100%');
  });

  it('respects decimals param', () => {
    expect(formatPercent(67.4, 1)).toBe('67.4%');
  });
});

describe('formatBytes', () => {
  it('shows B under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('shows KB under 1 MB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('shows MB under 1 GB', () => {
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });

  it('shows GB at 1 GB+', () => {
    expect(formatBytes(1_073_741_824)).toBe('1.00 GB');
  });
});
