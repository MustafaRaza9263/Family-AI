/**
 * Real Mongo + real ComfyUI end-to-end check of the job pipeline.
 * Creates two throwaway users, enqueues A×3 + B×1, prints order/events/metrics, cleans up.
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { ObjectId } from 'mongodb';
import { compose } from '../src/compose.js';
import { closeMongo } from '../src/db/mongo.js';
import type { StudioEvent } from '@studio/shared';

async function main(): Promise<void> {
  const studio = await compose();
  const {
    env,
    logger,
    db,
    users,
    threads,
    jobs,
    generation,
    worker,
    hub,
    telemetry,
    comfy,
    clock,
  } = studio;

  const events: StudioEvent[] = [];
  const stamp = Date.now();
  const emailA = `smoke-a-${stamp}@example.com`;
  const emailB = `smoke-b-${stamp}@example.com`;

  const userA = await users.create({
    email: emailA,
    fullName: 'Smoke A',
    passwordHash: 'x',
    role: 'user',
    status: 'active',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  const userB = await users.create({
    email: emailB,
    fullName: 'Smoke B',
    passwordHash: 'x',
    role: 'user',
    status: 'active',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });

  const unsubA = hub.subscribe(userA.id, (ev) => {
    if (ev.type !== 'heartbeat') {
      events.push(ev);
      process.stdout.write(`sse A ${JSON.stringify(ev)}\n`);
    }
  });
  const unsubB = hub.subscribe(userB.id, (ev) => {
    if (ev.type !== 'heartbeat') {
      events.push(ev);
      process.stdout.write(`sse B ${JSON.stringify(ev)}\n`);
    }
  });

  const threadA = await threads.create({
    userId: userA.id,
    title: 'smoke A',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  const threadB = await threads.create({
    userId: userB.id,
    title: 'smoke B',
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });

  await worker.start();

  const created = [];
  for (let i = 0; i < 3; i++) {
    created.push(
      await generation.createGeneration(userA.id, threadA.id, {
        tool: 'image',
        prompt: `smoke A job ${i}`,
        values: { aspectRatio: '1:1' },
        variant: 'fast',
        inputAssetIds: [],
      }),
    );
  }
  created.push(
    await generation.createGeneration(userB.id, threadB.id, {
      tool: 'image',
      prompt: 'smoke B job',
      values: { aspectRatio: '1:1' },
      variant: 'fast',
      inputAssetIds: [],
    }),
  );

  const queued = await jobs.listQueued();
  const running = await jobs.listByStatus('running');
  process.stdout.write(
    `queue snapshot queued=${queued.length} running=${running.length}\n`,
  );
  process.stdout.write(
    `created order: ${created.map((j) => `${j.id}:${j.userId === userA.id ? 'A' : 'B'}`).join(', ')}\n`,
  );

  await waitForJobsDone(
    jobs,
    created.map((j) => j.id),
    10 * 60_000,
  );

  for (const job of created) {
    const final = await jobs.findById(job.id);
    process.stdout.write(
      `job ${job.id} status=${final?.status} error=${final?.errorCode ?? ''}\n`,
    );
    const metrics = await db.collection('job_metrics').findOne({ jobId: job.id });
    process.stdout.write(
      `metrics ${job.id} warm=${String((metrics as { warm?: boolean } | null)?.warm)} ${JSON.stringify(metrics)}\n`,
    );
  }

  unsubA();
  unsubB();
  await worker.stop();
  await telemetry.flush();
  comfy.close();
  hub.close();

  // Cleanup throwaway users, jobs, threads, assets, files.
  const userIds = [userA.id, userB.id];
  await db.collection('jobs').deleteMany({
    userId: { $in: userIds.map((id) => new ObjectId(id)) },
  });
  await db.collection('threads').deleteMany({
    userId: { $in: userIds.map((id) => new ObjectId(id)) },
  });
  await db.collection('assets').deleteMany({
    userId: { $in: userIds.map((id) => new ObjectId(id)) },
  });
  await db.collection('usage_daily').deleteMany({
    userId: { $in: userIds.map((id) => new ObjectId(id)) },
  });
  await db.collection('job_metrics').deleteMany({
    userId: { $in: userIds },
  });
  await db.collection('users').deleteMany({
    _id: { $in: userIds.map((id) => new ObjectId(id)) },
  });
  for (const id of userIds) {
    await rm(path.join(env.DATA_DIR, id), { recursive: true, force: true }).catch(
      () => undefined,
    );
  }

  await closeMongo(logger);
  process.stdout.write(`queue-smoke done events=${events.length}\n`);
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
  throw new Error('queue-smoke timed out waiting for jobs');
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
