import type { GpuReading } from './types.js';

function parseField(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.toUpperCase() === '[N/A]') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Parse one nvidia-smi CSV line: util,power,temp (no header, no units). */
export function parseNvidiaSmiLine(line: string): GpuReading | null {
  const trimmed = line.trim();
  if (trimmed === '') {
    return null;
  }
  const parts = trimmed.split(',');
  if (parts.length < 3) {
    return null;
  }
  const util = parts[0];
  const power = parts[1];
  const temp = parts[2];
  if (util === undefined || power === undefined || temp === undefined) {
    return null;
  }
  return {
    gpuUtilPct: parseField(util),
    powerW: parseField(power),
    tempC: parseField(temp),
  };
}

export const NVIDIA_SMI_ARGS = [
  '--query-gpu=utilization.gpu,power.draw,temperature.gpu',
  '--format=csv,noheader,nounits',
  '-lms',
  '1000',
] as const;
