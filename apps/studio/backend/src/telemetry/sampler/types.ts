import type { HardwareSample } from '../types.js';

/**
 * Hardware reader with process lifetime tied to active runs.
 * acquire/release are reference-counted; read() is sync and never blocks long.
 */
export type HardwareSampler = {
  acquire(): void;
  release(): void;
  read(): HardwareSample;
};

export type GpuReading = {
  gpuUtilPct: number | null;
  powerW: number | null;
  tempC: number | null;
};

export type MemReading = {
  memUsedMb: number | null;
  memAvailableMb: number | null;
  swapUsedMb: number | null;
  memTotalMb: number | null;
};

export type GpuProcessHandle = {
  kill(): void;
};

/**
 * Starts a long-lived reader. onLine per CSV row; onExit on unexpected death;
 * onSpawnFailed when the binary cannot be started (e.g. missing nvidia-smi).
 */
export type SpawnGpu = (
  onLine: (line: string) => void,
  onExit: (code: number | null) => void,
  onSpawnFailed: () => void,
) => GpuProcessHandle;
