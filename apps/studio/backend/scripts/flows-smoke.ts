/**
 * Real Mongo + engine smoke for all image modes.
 * One throwaway user: fast → best → edit → ref-2 → ref-3 → ref-4.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import { compose } from '../src/compose.js';
import { closeMongo } from '../src/db/mongo.js';

type Row = {
  mode: string;
  runMs: number | null;
  warm: boolean | null;
  memUsedPeakMb: number | null;
  swapUsedPeakMb: number | null;
  size: string;
};

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

  const outDir = path.resolve('./tmp/smoke/flows');
  await mkdir(outDir, { recursive: true });

  const stamp = Date.now();
  const email = `flows-smoke-${stamp}@example.com`;
  const user = await users.create({
    email,
    fullName: 'Flows Smoke',
    passwordHash: 'x',
    role: 'user',
    status: 'active',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  const thread = await threads.create({
    userId: user.id,
    title: 'flows smoke',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });

  await worker.start();
  const rows: Row[] = [];

  async function runMode(
    mode: string,
    body: Record<string, unknown>,
  ): Promise<string | undefined> {
    const job = await generation.createGeneration(user.id, thread.id, body);
    await waitForJobsDone(jobs, [job.id], 15 * 60_000);
    const final = await jobs.findById(job.id);
    const metrics = (await db.collection('job_metrics').findOne({
      jobId: job.id,
    })) as {
      runMs?: number;
      warm?: boolean;
      memUsedPeakMb?: number;
      swapUsedPeakMb?: number;
      output?: { width?: number; height?: number };
    } | null;

    const assetId = final?.outputAssetIds[0];
    let size = '—';
    if (assetId) {
      const asset = await assets.findById(assetId);
      if (asset?.filePath) {
        const bytes = await readFile(asset.filePath);
        await writeFile(path.join(outDir, `${mode}.png`), bytes);
        size = `${asset.width}x${asset.height}`;
      }
    }

    rows.push({
      mode,
      runMs: metrics?.runMs ?? null,
      warm: metrics?.warm ?? null,
      memUsedPeakMb: metrics?.memUsedPeakMb ?? null,
      swapUsedPeakMb: metrics?.swapUsedPeakMb ?? null,
      size,
    });

    if (final?.status !== 'done') {
      throw new Error(
        `${mode} failed status=${final?.status} error=${final?.errorCode ?? ''}`,
      );
    }
    return assetId;
  }

  const fastId = await runMode('fast', {
    tool: 'image',
    prompt: 'a red ceramic cup on a wooden table, soft daylight',
    values: { aspectRatio: '1:1' },
    variant: 'fast',
    inputAssetIds: [],
  });

  await runMode('best', {
    tool: 'image',
    prompt: 'a blue ceramic bowl on marble, soft daylight',
    values: { aspectRatio: '1:1' },
    variant: 'best',
    inputAssetIds: [],
  });

  if (!fastId) throw new Error('fast produced no asset');
  await runMode('edit', {
    tool: 'image',
    prompt: 'make the cup green',
    values: { aspectRatio: '1:1' },
    inputAssetIds: [fastId],
  });

  const uploadPng = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: { r: 30, g: 120, b: 80 },
    },
  })
    .png()
    .toBuffer();
  const uploaded = await uploads.uploadImage(user.id, uploadPng);

  await runMode('reference-2', {
    tool: 'image',
    prompt: 'put the subject from image 1 into the scene of image 2',
    values: { aspectRatio: '1:1' },
    inputAssetIds: [fastId, uploaded.id],
  });

  const uploadB = await uploads.uploadImage(
    user.id,
    await sharp({
      create: {
        width: 512,
        height: 640,
        channels: 3,
        background: { r: 180, g: 90, b: 40 },
      },
    })
      .png()
      .toBuffer(),
  );

  await runMode('reference-3', {
    tool: 'image',
    prompt: 'combine image 1, image 2 and image 3 into one scene',
    values: { aspectRatio: '1:1' },
    inputAssetIds: [fastId, uploaded.id, uploadB.id],
  });

  const uploadC = await uploads.uploadImage(
    user.id,
    await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 40, g: 40, b: 160 },
      },
    })
      .png()
      .toBuffer(),
  );

  await runMode('reference-4', {
    tool: 'image',
    prompt: 'combine all four images into one coherent scene',
    values: { aspectRatio: '1:1' },
    inputAssetIds: [fastId, uploaded.id, uploadB.id, uploadC.id],
  });

  process.stdout.write(
    'mode\trunMs\twarm\tmemUsedPeakMb\tswapUsedPeakMb\tsize\n',
  );
  for (const row of rows) {
    process.stdout.write(
      `${row.mode}\t${row.runMs ?? '—'}\t${String(row.warm)}\t${row.memUsedPeakMb ?? '—'}\t${row.swapUsedPeakMb ?? '—'}\t${row.size}\n`,
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
  process.stdout.write('flows-smoke done\n');
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
  throw new Error('flows-smoke timed out waiting for jobs');
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
