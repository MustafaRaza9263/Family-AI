import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { NVIDIA_SMI_ARGS } from './nvidia-smi.js';
import type { GpuProcessHandle } from './types.js';

/** Long-lived nvidia-smi CSV stream; onSpawnFailed covers missing binary. */
export function defaultSpawnGpu(
  onLine: (line: string) => void,
  onExit: (code: number | null) => void,
  onSpawnFailed: () => void,
): GpuProcessHandle {
  const child = spawn('nvidia-smi', [...NVIDIA_SMI_ARGS], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let buffer = '';
  let spawnFailed = false;
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      onLine(line);
      newline = buffer.indexOf('\n');
    }
  });
  child.once('error', () => {
    spawnFailed = true;
    onSpawnFailed();
  });
  child.once('exit', (code) => {
    if (!spawnFailed) {
      onExit(code);
    }
  });
  return {
    kill: () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    },
  };
}

export function defaultReadMeminfoText(): string | null {
  try {
    return readFileSync('/proc/meminfo', 'utf8');
  } catch {
    return null;
  }
}
