import type { MemReading } from './types.js';

function kbField(map: Map<string, number>, key: string): number | null {
  const value = map.get(key);
  return value === undefined ? null : value;
}

/** Parse /proc/meminfo text. Used memory is Total − Available (not MemFree). */
export function parseMeminfo(text: string): MemReading | null {
  const map = new Map<string, number>();
  for (const line of text.split('\n')) {
    const match = /^(\w+):\s+(\d+)/.exec(line);
    if (!match) {
      continue;
    }
    const key = match[1];
    const raw = match[2];
    if (key === undefined || raw === undefined) {
      continue;
    }
    map.set(key, Number(raw));
  }

  const memTotalKb = kbField(map, 'MemTotal');
  const memAvailableKb = kbField(map, 'MemAvailable');
  const swapTotalKb = kbField(map, 'SwapTotal');
  const swapFreeKb = kbField(map, 'SwapFree');

  if (memTotalKb === null || memAvailableKb === null) {
    return null;
  }

  const memUsedMb = (memTotalKb - memAvailableKb) / 1024;
  const memAvailableMb = memAvailableKb / 1024;
  const memTotalMb = memTotalKb / 1024;

  let swapUsedMb: number | null = null;
  if (swapTotalKb !== null && swapFreeKb !== null) {
    swapUsedMb = (swapTotalKb - swapFreeKb) / 1024;
  }

  return {
    memUsedMb,
    memAvailableMb,
    swapUsedMb,
    memTotalMb,
  };
}
