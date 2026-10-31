import { z } from 'zod';
import type { Recipe } from '../comfy/recipes/recipe.js';
import type { EventHub } from '../events/hub.js';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { LimitsService } from '../limits/limits.service.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRecord, JobRepository } from '../db/repositories/job-repository.js';
import type { ThreadRepository } from '../db/repositories/thread-repository.js';
import { orderQueue } from '../queue/scheduler.js';
import { publishQueuePositions } from '../queue/positions.js';
import { pickRecipe } from './pick-recipe.js';

const createGenerationSchema = z.object({
  tool: z.enum(['image', 'video']),
  prompt: z.string().min(1).max(1000),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  variant: z.string().optional(),
  inputAssetIds: z.array(z.string().min(1)).max(4).default([]),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

export type GenerationServiceDeps = {
  jobs: JobRepository;
  threads: ThreadRepository;
  assets: AssetRepository;
  limits: LimitsService;
  hub: EventHub;
  clock: Clock;
  recipes: ReadonlyMap<string, Recipe>;
  wake: () => void;
  lastServedAt: Map<string, number>;
};

export class GenerationService {
  constructor(private readonly deps: GenerationServiceDeps) {}

  async createGeneration(
    userId: string,
    threadId: string,
    raw: unknown,
  ): Promise<JobRecord> {
    const parsed = createGenerationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid generation input', {
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    const input = parsed.data;

    const thread = await this.deps.threads.findByIdForUser(threadId, userId);
    if (!thread) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Thread not found');
    }

    await this.assertInputAssets(userId, input.inputAssetIds);

    let picked;
    try {
      picked = pickRecipe(
        {
          tool: input.tool,
          variant: input.variant,
          inputAssetIds: input.inputAssetIds,
        },
        this.deps.recipes,
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        400,
        ErrorCodes.UNSUPPORTED_COMBINATION,
        'That combination of settings is not available',
      );
    }

    await this.deps.limits.checkSubmit(userId, picked.tool);
    await this.deps.limits.reserveRun(userId, picked.tool);

    const now = this.deps.clock.now();
    // Only a single-image edit has a clear parent for lineage.
    const parentAssetId =
      input.inputAssetIds.length === 1 ? input.inputAssetIds[0] : undefined;

    let job: JobRecord;
    try {
      job = await this.deps.jobs.create({
        userId,
        threadId,
        tool: picked.tool,
        recipeId: picked.recipeId,
        variant: input.variant,
        prompt: input.prompt,
        params: input.values,
        inputAssetIds: input.inputAssetIds,
        parentAssetId,
        queuedAt: now,
      });
    } catch (err) {
      await this.deps.limits.refundRun(userId, picked.tool);
      throw err;
    }

    await this.deps.threads.touchUpdatedAt(threadId, now);

    const queued = await this.deps.jobs.listQueued();
    const ordered = orderQueue(queued, this.deps.lastServedAt);
    const index = ordered.findIndex((j) => j.id === job.id);
    const position = index >= 0 ? index + 1 : queued.length;

    this.deps.hub.publish(userId, {
      type: 'job.queued',
      jobId: job.id,
      threadId,
      position,
    });
    await publishQueuePositions(
      this.deps.jobs,
      this.deps.hub,
      this.deps.lastServedAt,
    );

    this.deps.wake();
    return job;
  }

  private async assertInputAssets(
    userId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const assets = await this.deps.assets.findByIds(ids);
    if (assets.length !== ids.length) {
      throw new AppError(
        400,
        ErrorCodes.INVALID_INPUT,
        'One or more input images were not found',
      );
    }
    const byId = new Map(assets.map((a) => [a.id, a]));
    for (const id of ids) {
      const asset = byId.get(id);
      if (!asset || asset.userId !== userId) {
        throw new AppError(
          400,
          ErrorCodes.INVALID_INPUT,
          'One or more input images were not found',
        );
      }
      if (asset.deletedAt) {
        throw new AppError(
          400,
          ErrorCodes.INVALID_INPUT,
          'One or more input images were deleted',
        );
      }
      if (asset.kind !== 'image') {
        throw new AppError(
          400,
          ErrorCodes.INVALID_INPUT,
          'Only image inputs are supported',
        );
      }
    }
  }
}
