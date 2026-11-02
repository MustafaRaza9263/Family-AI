/**
 * Real Mongo + engine smoke for LTX video modes.
 * Default: t2v → i2v → frames2v → extract last frame of t2v;
 * plus i2v portrait-at-16:9 framing check. Flag --matrix runs every
 * quality×duration at 16:9. Flag --verbose dumps history output keys.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import { compose } from '../src/compose.js';
import { closeMongo } from '../src/db/mongo.js';
import { createFfmpegMedia } from '../src/media/index.js';

type Row = {
  mode: string;
  quality: string;
  duration: string;
  runMs: number | null;
  warm: boolean | null;
  loadMs: number | null;
  sampleMs: number | null;
  decodeMs: number | null;
  otherMs: number | null;
  memUsedPeakMb: number | null;
  swapUsedPeakMb: number | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  frames: number | null;
};

const matrix = process.argv.includes('--matrix');
const verbose = process.argv.includes('--verbose');

async function main(): Promise<void> {
  const studio = await compose();
  const {
    env,
    logger,
    db,
    users,
    threads,
    jobs,
    assets,
    generation,
    worker,
    telemetry,
    comfy,
    clock,
    uploads,
  } = studio;

  const outDir = path.resolve('./tmp/smoke/video');
  await mkdir(outDir, { recursive: true });
  const media = createFfmpegMedia({
    ffmpegPath: env.FFMPEG_PATH,
    ffprobePath: env.FFPROBE_PATH,
  });

  const stamp = Date.now();
  const email = `video-smoke-${stamp}@example.com`;
  const user = await users.create({
    email,
    fullName: 'Video Smoke',
    passwordHash: 'x',
    role: 'user',
    status: 'active',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  const thread = await threads.create({
    userId: user.id,
    tool: 'video',
    title: 'video smoke',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });

  await worker.start();
  const rows: Row[] = [];

  async function runMode(
    mode: string,
    body: Record<string, unknown>,
  ): Promise<string | undefined> {
    const values = (body.values ?? {}) as Record<string, string>;
    const job = await generation.createGeneration(user.id, thread.id, body);
    await waitForJobsDone(jobs, [job.id], 30 * 60_000);
    const final = await jobs.findById(job.id);
    const metrics = (await db.collection('job_metrics').findOne({
      jobId: job.id,
    })) as {
      runMs?: number;
      warm?: boolean;
      memUsedPeakMb?: number;
      swapUsedPeakMb?: number;
      phases?: {
        loadMs?: number;
        sampleMs?: number;
        decodeMs?: number;
        otherMs?: number;
      };
      output?: {
        width?: number;
        height?: number;
        frames?: number;
        bytes?: number;
      };
    } | null;

    const assetId = final?.outputAssetIds[0];
    let bytes: number | null = null;
    let width: number | null = null;
    let height: number | null = null;
    if (assetId) {
      const asset = await assets.findById(assetId);
      if (asset?.filePath) {
        const data = await readFile(asset.filePath);
        await writeFile(path.join(outDir, `${mode}.mp4`), data);
        bytes = asset.bytes;
        width = asset.width;
        height = asset.height;
      }
    }

    if (verbose && final?.comfyPromptId) {
      await dumpHistoryKeys(env.COMFY_URL, final.comfyPromptId);
    }

    rows.push({
      mode,
      quality: values.quality ?? '—',
      duration: values.duration ?? '—',
      runMs: metrics?.runMs ?? null,
      warm: metrics?.warm ?? null,
      loadMs: metrics?.phases?.loadMs ?? null,
      sampleMs: metrics?.phases?.sampleMs ?? null,
      decodeMs: metrics?.phases?.decodeMs ?? null,
      otherMs: metrics?.phases?.otherMs ?? null,
      memUsedPeakMb: metrics?.memUsedPeakMb ?? null,
      swapUsedPeakMb: metrics?.swapUsedPeakMb ?? null,
      bytes: metrics?.output?.bytes ?? bytes,
      width: metrics?.output?.width ?? width,
      height: metrics?.output?.height ?? height,
      frames: metrics?.output?.frames ?? null,
    });

    if (final?.status !== 'done') {
      throw new Error(
        `${mode} failed status=${final?.status} error=${final?.errorCode ?? ''}`,
      );
    }
    return assetId;
  }

  const t2vId = await runMode('t2v', {
    tool: 'video',
    prompt: 'a candle flame flickering on a wooden table, soft room tone',
    values: { aspectRatio: '16:9', quality: 'standard', duration: '5' },
    inputAssetIds: [],
  });

  const startPng = await sharp({
    create: {
      width: 1024,
      height: 576,
      channels: 3,
      background: { r: 40, g: 90, b: 140 },
    },
  })
    .png()
    .toBuffer();
  const startAsset = await uploads.uploadImage(user.id, startPng);

  await runMode('i2v', {
    tool: 'video',
    prompt: 'gentle camera push-in, soft daylight',
    values: { aspectRatio: '16:9', quality: 'standard', duration: '5' },
    inputAssetIds: [startAsset.id],
  });

  const endPng = await sharp({
    create: {
      width: 1024,
      height: 576,
      channels: 3,
      background: { r: 160, g: 70, b: 40 },
    },
  })
    .png()
    .toBuffer();
  const endAsset = await uploads.uploadImage(user.id, endPng);

  await runMode('frames2v', {
    tool: 'video',
    prompt: 'smooth transition from the first frame to the last',
    values: { aspectRatio: '16:9', quality: 'standard', duration: '5' },
    inputAssetIds: [startAsset.id, endAsset.id],
  });

  // Portrait source framed for 16:9 — save input + first frame of result.
  const portraitPng = await sharp({
    create: {
      width: 640,
      height: 800,
      channels: 3,
      background: { r: 90, g: 40, b: 120 },
    },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(outDir, 'i2v-portrait-input.png'), portraitPng);
  const portraitAsset = await uploads.uploadImage(user.id, portraitPng);
  const portraitOutId = await runMode('i2v-portrait-16x9', {
    tool: 'video',
    prompt: 'subtle head turn, natural motion',
    values: { aspectRatio: '16:9', quality: 'standard', duration: '5' },
    inputAssetIds: [portraitAsset.id],
  });
  if (portraitOutId) {
    const portraitVideo = await assets.findById(portraitOutId);
    if (portraitVideo?.filePath) {
      const first = await media.extractFrame(portraitVideo.filePath, 'first');
      await writeFile(
        path.join(outDir, 'i2v-portrait-16x9-first.png'),
        first,
      );
    }
  }

  if (!t2vId) throw new Error('t2v produced no asset');
  const t2vAsset = await assets.findById(t2vId);
  if (!t2vAsset?.filePath) throw new Error('t2v asset missing file');
  const lastFrame = await media.extractFrame(t2vAsset.filePath, 'last');
  await writeFile(path.join(outDir, 't2v-last-frame.png'), lastFrame);

  if (matrix) {
    for (const quality of ['standard', 'hd'] as const) {
      for (const duration of ['5', '8', '10'] as const) {
        if (quality === 'standard' && duration === '5') continue;
        await runMode(`t2v-${quality}-${duration}`, {
          tool: 'video',
          prompt: `matrix ${quality} ${duration}s, soft daylight interior`,
          values: { aspectRatio: '16:9', quality, duration },
          inputAssetIds: [],
        });
      }
    }
  }

  process.stdout.write(
    'mode\tquality\tduration\trunMs\twarm\tloadMs\tsampleMs\tdecodeMs\totherMs\tmemUsedPeakMb\tswapUsedPeakMb\tbytes\twidth\theight\tframes\n',
  );
  for (const row of rows) {
    process.stdout.write(
      [
        row.mode,
        row.quality,
        row.duration,
        row.runMs ?? '—',
        String(row.warm),
        row.loadMs ?? '—',
        row.sampleMs ?? '—',
        row.decodeMs ?? '—',
        row.otherMs ?? '—',
        row.memUsedPeakMb ?? '—',
        row.swapUsedPeakMb ?? '—',
        row.bytes ?? '—',
        row.width ?? '—',
        row.height ?? '—',
        row.frames ?? '—',
      ].join('\t') + '\n',
    );
  }

  await worker.stop();
  await telemetry.flush();
  comfy.close();

  await db.collection('jobs').deleteMany({ userId: new ObjectId(user.id) });
  await db.collection('threads').deleteMany({ userId: new ObjectId(user.id) });
  await db.collection('assets').deleteMany({ userId: new ObjectId(user.id) });
  await db.collection('usage_daily').deleteMany({
    userId: new ObjectId(user.id),
  });
  await db.collection('job_metrics').deleteMany({ userId: user.id });
  await db.collection('users').deleteOne({ _id: new ObjectId(user.id) });
  await rm(path.join(env.DATA_DIR, user.id), {
    recursive: true,
    force: true,
  }).catch(() => undefined);

  await closeMongo(logger);
  process.stdout.write('video-smoke done\n');
}

async function dumpHistoryKeys(
  comfyUrl: string,
  promptId: string,
): Promise<void> {
  const res = await fetch(`${comfyUrl}/history/${promptId}`);
  if (!res.ok) {
    process.stdout.write(`verbose: history HTTP ${res.status}\n`);
    return;
  }
  const raw = (await res.json()) as Record<
    string,
    { outputs?: Record<string, Record<string, unknown>> }
  >;
  const entry = raw[promptId];
  const outputs = entry?.outputs ?? {};
  for (const [nodeId, nodeOut] of Object.entries(outputs)) {
    process.stdout.write(
      `verbose: node ${nodeId} keys=${Object.keys(nodeOut).join(',')}\n`,
    );
  }
}

async function waitForJobsDone(
  jobs: {
    findById(id: string): Promise<{ status: string } | null>;
  },
  ids: string[],
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await Promise.all(ids.map((id) => jobs.findById(id)));
    if (
      rows.every(
        (j) =>
          j &&
          (j.status === 'done' ||
            j.status === 'failed' ||
            j.status === 'cancelled'),
      )
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('video-smoke timed out waiting for jobs');
}

main()
  .catch((err: unknown) => {
    process.stderr.write(
      `${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
    );
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
