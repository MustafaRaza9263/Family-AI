import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemSampler } from '../../src/telemetry/sampler/system-sampler.js';
import type { GpuProcessHandle } from '../../src/telemetry/sampler/types.js';
import { silentLogger } from './helpers.js';

describe('SystemSampler refcount', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on first acquire, stops at zero, and shares one process across runs', () => {
    let starts = 0;
    let stops = 0;
    let handle: GpuProcessHandle | null = null;

    const sampler = new SystemSampler({
      logger: silentLogger(),
      spawnGpu: () => {
        starts += 1;
        handle = {
          kill: () => {
            stops += 1;
            handle = null;
          },
        };
        return handle;
      },
      readMeminfoText: () =>
        [
          'MemTotal:       2048 kB',
          'MemAvailable:   1024 kB',
          'SwapTotal:         0 kB',
          'SwapFree:          0 kB',
        ].join('\n'),
    });

    sampler.acquire();
    expect(starts).toBe(1);
    sampler.acquire();
    expect(starts).toBe(1);

    const reading = sampler.read();
    expect(reading.memUsedMb).toBeCloseTo(1);
    expect(reading.memTotalMb).toBeCloseTo(2);

    sampler.release();
    expect(stops).toBe(0);
    sampler.release();
    expect(stops).toBe(1);
    expect(handle).toBeNull();
  });

  it('marks GPU unavailable after spawn failure without restarting', () => {
    const sampler = new SystemSampler({
      logger: silentLogger(),
      spawnGpu: (_onLine, _onExit, onSpawnFailed) => {
        onSpawnFailed();
        return { kill: () => undefined };
      },
      readMeminfoText: () => null,
    });

    sampler.acquire();
    const reading = sampler.read();
    expect(reading.gpuUtilPct).toBeNull();
    expect(reading.powerW).toBeNull();
    sampler.release();
  });
});
