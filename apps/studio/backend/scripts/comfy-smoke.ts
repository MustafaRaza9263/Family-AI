/**
 * Real ComfyUI + real telemetry. comfy/ stays free of telemetry imports;
 * this script wires both sides together for a manual smoke check.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../src/config/env.js';
import { systemClock } from '../src/lib/clock.js';
import { createLogger } from '../src/lib/logger.js';
import { createComfy, EngineError } from '../src/comfy/index.js';
import {
  createTelemetry,
  MemoryMetricsStore,
  SystemSampler,
  telemetryConfigFromEnv,
} from '../src/telemetry/index.js';

type Flags = {
  prompt: string;
  aspect: string;
  repeat: number;
  verbose: boolean;
  cancelAfter: number | null;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    prompt: 'a red ceramic mug on a wooden table, soft daylight',
    aspect: '1:1',
    repeat: 1,
    verbose: false,
    cancelAfter: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) break;
    if (arg === '--prompt') flags.prompt = argv[++i] ?? flags.prompt;
    else if (arg === '--aspect') flags.aspect = argv[++i] ?? flags.aspect;
    else if (arg === '--repeat') flags.repeat = Number(argv[++i] ?? '1');
    else if (arg === '--verbose') flags.verbose = true;
    else if (arg === '--cancel-after') {
      flags.cancelAfter = Number(argv[++i] ?? '0');
    }
  }
  return flags;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
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

  const comfy = await createComfy({
    env,
    logger,
    onRawText: flags.verbose
      ? (text) => {
          process.stdout.write(`[ws] ${text.slice(0, 300)}\n`);
        }
      : undefined,
  });

  await comfy.ping();

  for (let i = 0; i < flags.repeat; i++) {
    const jobId = `smoke-${Date.now()}-${i}`;
    const queuedAt = new Date();
    telemetry.runStart(jobId, {
      userId: 'smoke-user',
      recipeId: 'image-create-fast',
      tool: 'image',
      queuedAt,
    });

    const ac = new AbortController();
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    if (flags.cancelAfter !== null) {
      cancelTimer = setTimeout(
        () => ac.abort(),
        flags.cancelAfter * 1000,
      );
    }

    try {
      const result = await comfy.run('image-create-fast', {
        jobId,
        values: { prompt: flags.prompt, aspectRatio: flags.aspect },
        signal: ac.signal,
        hooks: {
          onCached(nodes) {
            telemetry.runEvent(jobId, {
              type: 'nodes_cached',
              nodes,
              at: new Date(),
            });
          },
          onNodeStart(info) {
            telemetry.runEvent(jobId, {
              type: 'node_start',
              nodeId: info.nodeId,
              nodeClass: info.nodeClass,
              nodeTitle: info.nodeTitle,
              at: info.at,
            });
          },
        },
      });

      const image = result.outputs[0];
      const bytes = image?.byteLength ?? 0;
      telemetry.runEnd(jobId, {
        status: 'done',
        output: {
          width:
            typeof result.resolved.width === 'number'
              ? result.resolved.width
              : undefined,
          height:
            typeof result.resolved.height === 'number'
              ? result.resolved.height
              : undefined,
          bytes,
        },
      });

      if (!image) {
        throw new Error('smoke run returned no image bytes');
      }
      const outDir = path.join('tmp', 'smoke');
      await mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, `${jobId}.png`);
      await writeFile(outPath, image);
      process.stdout.write(`saved ${outPath}\n`);
    } catch (err) {
      const code =
        err instanceof EngineError ? err.code : 'ENGINE_FAILED';
      const cancelled = code === 'ENGINE_CANCELLED';
      telemetry.runEnd(jobId, {
        status: cancelled ? 'cancelled' : 'failed',
        errorCode: code,
      });
      if (!cancelled) throw err;
    } finally {
      if (cancelTimer) clearTimeout(cancelTimer);
    }

    await telemetry.flush();
    const row = await store.findByJobId(jobId);
    process.stdout.write(`${JSON.stringify(row, null, 2)}\n`);
    if (row) {
      process.stdout.write(
        `summary job=${jobId} status=${row.status} runMs=${row.runMs} bytes=${row.output?.bytes ?? 0}\n`,
      );
    }
  }

  await telemetry.flush();
  comfy.close();
}

main()
  .catch((err: unknown) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
