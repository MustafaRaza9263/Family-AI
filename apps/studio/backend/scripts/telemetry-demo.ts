/**
 * Fake a ~5s generation against the real SystemSampler + MemoryMetricsStore.
 * Prints the final metrics row as JSON. Safe to run on a laptop (GPU fields null).
 */
import { loadEnv } from '../src/config/env.js';
import { createLogger } from '../src/lib/logger.js';
import { systemClock } from '../src/lib/clock.js';
import {
  createTelemetry,
  MemoryMetricsStore,
  SystemSampler,
  telemetryConfigFromEnv,
} from '../src/telemetry/index.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);
  const store = new MemoryMetricsStore();
  const sampler = new SystemSampler({ logger });
  const telemetry = createTelemetry({
    store,
    sampler,
    logger,
    clock: systemClock,
    config: telemetryConfigFromEnv(env),
  });

  const jobId = `demo-${Date.now()}`;
  const queuedAt = new Date(Date.now() - 250);

  telemetry.runStart(jobId, {
    userId: 'demo-user',
    recipeId: 'image-create-fast',
    tool: 'image',
    queuedAt,
  });

  await sleep(200);
  telemetry.runEvent(jobId, {
    type: 'nodes_cached',
    nodes: [
      { nodeId: '1', nodeClass: 'CLIPLoader', nodeTitle: 'Load CLIP' },
      { nodeId: '2', nodeClass: 'VAELoader', nodeTitle: 'Load VAE' },
    ],
    at: new Date(),
  });

  await sleep(300);
  telemetry.runEvent(jobId, {
    type: 'node_start',
    nodeId: '3',
    nodeClass: 'UNETLoader',
    nodeTitle: 'Load Model',
    at: new Date(),
  });

  await sleep(1200);
  telemetry.runEvent(jobId, {
    type: 'node_start',
    nodeId: '4',
    nodeClass: 'KSampler',
    nodeTitle: 'IN_SAMPLER',
    at: new Date(),
  });

  await sleep(2500);
  telemetry.runEvent(jobId, {
    type: 'node_start',
    nodeId: '5',
    nodeClass: 'VAEDecode',
    nodeTitle: 'Decode',
    at: new Date(),
  });

  await sleep(800);
  telemetry.runEnd(jobId, {
    status: 'done',
    output: { width: 1024, height: 1024, bytes: 1_500_000 },
  });

  await telemetry.flush();
  const row = await store.findByJobId(jobId);
  process.stdout.write(`${JSON.stringify(row, null, 2)}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
