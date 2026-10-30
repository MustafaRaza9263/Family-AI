import pino from 'pino';
import type { Clock } from '../../src/lib/clock.js';
import type { Logger } from '../../src/lib/logger.js';
import type { HardwareSample } from '../../src/telemetry/types.js';
import type { HardwareSampler } from '../../src/telemetry/sampler/types.js';

export function silentLogger(): Logger {
  return pino({ level: 'silent' });
}

export function mutableClock(startMs = 1_000_000): Clock & { advance(ms: number): void } {
  let nowMs = startMs;
  return {
    now: () => new Date(nowMs),
    advance(ms: number) {
      nowMs += ms;
    },
  };
}

export class FakeSampler implements HardwareSampler {
  acquires = 0;
  releases = 0;
  throwOnRead = false;
  sample: HardwareSample = {
    at: new Date(0),
    gpuUtilPct: 40,
    powerW: 100,
    tempC: 55,
    memUsedMb: 8000,
    memAvailableMb: 16000,
    swapUsedMb: 100,
    memTotalMb: 24000,
  };

  acquire(): void {
    this.acquires += 1;
  }

  release(): void {
    this.releases += 1;
  }

  read(): HardwareSample {
    if (this.throwOnRead) {
      throw new Error('sampler read failed');
    }
    return { ...this.sample, at: new Date(this.sample.at) };
  }
}
