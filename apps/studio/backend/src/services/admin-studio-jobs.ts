import type { AdminJobsQuery } from '@studio/shared';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { UserRepository } from '../db/repositories/user-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { escapeRegex } from '../lib/escape-regex.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toAdminJobDetail, toAdminJobRow } from '../mappers/admin-job.js';
import type { MetricsStore } from '../telemetry/store/types.js';
import type { Telemetry } from '../telemetry/types.js';

export type AdminJobsDeps = {
  jobs: JobRepository;
  users: UserRepository;
  assets: AssetRepository;
  metrics: MetricsStore;
  telemetry: Telemetry;
  retentionDays: number;
  now: () => Date;
};

export async function listAdminJobs(deps: AdminJobsDeps, query: AdminJobsQuery) {
  const before = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !before) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
  }

  let userIds: string[] | undefined;
  if (query.user) {
    userIds = await deps.users.searchIdsByNameOrEmail(query.user);
    if (userIds.length === 0) {
      return { items: [], nextCursor: null };
    }
  }

  const rows = await deps.jobs.listAdmin({
    limit: query.limit + 1,
    before: before
      ? { queuedAt: before.at, id: before.id }
      : undefined,
    status: query.status,
    tool: query.tool,
    recipeId: query.recipe,
    userIds,
    promptRegex: query.q ? escapeRegex(query.q) : undefined,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  });

  const page = rows.slice(0, query.limit);
  const items = await mapRows(deps, page);
  const last = page[page.length - 1];
  return {
    items,
    nextCursor:
      rows.length > query.limit && last
        ? encodeCursor(last.timings.queuedAt, last.id)
        : null,
  };
}

export async function getAdminJob(deps: AdminJobsDeps, id: string) {
  const job = await deps.jobs.findById(id);
  if (!job) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Job not found');
  }
  const [users, assets, metricsRows] = await Promise.all([
    deps.users.findByIds([job.userId]),
    deps.assets.findByIds([...job.inputAssetIds, ...job.outputAssetIds]),
    deps.metrics.findByJobIds([job.id]),
  ]);
  const byAsset = new Map(assets.map((a) => [a.id, a]));
  const metrics = metricsRows[0] ?? null;
  const cutoff = new Date(
    deps.now().getTime() - deps.retentionDays * 24 * 60 * 60 * 1000,
  );
  const metricsExpired =
    !metrics &&
    job.timings.finishedAt !== undefined &&
    job.timings.finishedAt < cutoff;

  const live =
    job.status === 'running' && !metrics
      ? deps.telemetry.snapshot(job.id)
      : null;

  return {
    job: toAdminJobDetail({
      job,
      user: users[0],
      inputAssets: job.inputAssetIds
        .map((aid) => byAsset.get(aid))
        .filter((a): a is NonNullable<typeof a> => a !== undefined),
      outputAssets: job.outputAssetIds
        .map((aid) => byAsset.get(aid))
        .filter((a): a is NonNullable<typeof a> => a !== undefined),
      metrics,
      metricsExpired: metricsExpired || undefined,
      live,
    }),
  };
}

async function mapRows(deps: AdminJobsDeps, page: Awaited<ReturnType<JobRepository['listAdmin']>>) {
  const userIdSet = [...new Set(page.map((j) => j.userId))];
  const assetIds = [
    ...new Set(page.flatMap((j) => j.outputAssetIds)),
  ];
  const jobIds = page.map((j) => j.id);
  // Three batched lookups — never per-row queries.
  const [users, assets, metricsRows] = await Promise.all([
    deps.users.findByIds(userIdSet),
    deps.assets.findByIds(assetIds),
    deps.metrics.findByJobIds(jobIds),
  ]);
  const byUser = new Map(users.map((u) => [u.id, u]));
  const byAsset = new Map(assets.map((a) => [a.id, a]));
  const byMetrics = new Map(metricsRows.map((m) => [m.jobId, m]));
  return page.map((job) =>
    toAdminJobRow(
      job,
      byUser.get(job.userId),
      job.outputAssetIds
        .map((id) => byAsset.get(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined),
      byMetrics.get(job.id) ?? null,
    ),
  );
}
