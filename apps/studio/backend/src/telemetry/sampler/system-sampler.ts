import type { Clock } from '../../lib/clock.js';
import { systemClock } from '../../lib/clock.js';
import type { Logger } from '../../lib/logger.js';
import type { HardwareSample } from '../types.js';
import { defaultReadMeminfoText, defaultSpawnGpu } from './default-spawn.js';
import { parseMeminfo } from './meminfo.js';
import { parseNvidiaSmiLine } from './nvidia-smi.js';
import type { GpuProcessHandle, GpuReading, HardwareSampler, SpawnGpu } from './types.js';

const MAX_GPU_RESTARTS = 3;
const RESTART_BACKOFF_MS = 500;

export type SystemSamplerOptions = {
  logger: Logger;
  clock?: Clock;
  spawnGpu?: SpawnGpu;
  readMeminfoText?: () => string | null;
};

export class SystemSampler implements HardwareSampler {
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly spawnGpu: SpawnGpu;
  private readonly readMeminfoText: () => string | null;

  private refCount = 0;
  private handle: GpuProcessHandle | null = null;
  private latestGpu: GpuReading = { gpuUtilPct: null, powerW: null, tempC: null };
  private gpuUnavailable = false;
  private restartAttempts = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private missingLogged = false;
  private stopping = false;

  constructor(options: SystemSamplerOptions) {
    this.logger = options.logger;
    this.clock = options.clock ?? systemClock;
    this.spawnGpu = options.spawnGpu ?? defaultSpawnGpu;
    this.readMeminfoText = options.readMeminfoText ?? defaultReadMeminfoText;
  }

  acquire(): void {
    this.refCount += 1;
    if (this.refCount === 1) {
      this.stopping = false;
      this.restartAttempts = 0;
      this.startGpu();
    }
  }

  release(): void {
    if (this.refCount === 0) {
      return;
    }
    this.refCount -= 1;
    if (this.refCount === 0) {
      this.stopGpu();
    }
  }

  read(): HardwareSample {
    const memText = this.readMeminfoText();
    const mem = memText === null ? null : parseMeminfo(memText);
    return {
      at: this.clock.now(),
      gpuUtilPct: this.latestGpu.gpuUtilPct,
      powerW: this.latestGpu.powerW,
      tempC: this.latestGpu.tempC,
      memUsedMb: mem?.memUsedMb ?? null,
      memAvailableMb: mem?.memAvailableMb ?? null,
      swapUsedMb: mem?.swapUsedMb ?? null,
      memTotalMb: mem?.memTotalMb ?? null,
    };
  }

  private startGpu(): void {
    if (this.gpuUnavailable || this.handle !== null) {
      return;
    }
    try {
      this.handle = this.spawnGpu(
        (line) => {
          const parsed = parseNvidiaSmiLine(line);
          if (parsed) {
            this.latestGpu = parsed;
          }
        },
        () => {
          this.handle = null;
          if (this.stopping || this.refCount === 0) {
            return;
          }
          this.scheduleRestart();
        },
        () => {
          this.handle = null;
          this.logMissingOnce();
          this.markUnavailable();
        },
      );
    } catch {
      this.logMissingOnce();
      this.markUnavailable();
    }
  }

  private scheduleRestart(): void {
    this.restartAttempts += 1;
    if (this.restartAttempts > MAX_GPU_RESTARTS) {
      this.markUnavailable();
      return;
    }
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.refCount > 0 && !this.gpuUnavailable) {
        this.startGpu();
      }
    }, RESTART_BACKOFF_MS * this.restartAttempts);
  }

  private logMissingOnce(): void {
    if (this.missingLogged) {
      return;
    }
    this.missingLogged = true;
    this.logger.warn('nvidia-smi unavailable; GPU metrics will be null');
  }

  private markUnavailable(): void {
    this.gpuUnavailable = true;
    this.latestGpu = { gpuUtilPct: null, powerW: null, tempC: null };
  }

  private stopGpu(): void {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.handle) {
      this.handle.kill();
      this.handle = null;
    }
    this.restartAttempts = 0;
    this.gpuUnavailable = false;
    this.latestGpu = { gpuUtilPct: null, powerW: null, tempC: null };
  }
}
