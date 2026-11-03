import type { JobStage } from '@studio/shared';

/** In-flight job visible to admin.live (one at a time in this queue). */
export type CurrentJobInfo = {
  jobId: string;
  userId: string;
  recipeId: string;
  stage: JobStage;
  startedAt: Date;
};

export type CurrentJobSlot = {
  get(): CurrentJobInfo | null;
  set(info: CurrentJobInfo | null): void;
  setStage(stage: JobStage): void;
};

export function createCurrentJobSlot(): CurrentJobSlot {
  let current: CurrentJobInfo | null = null;
  return {
    get: () => current,
    set: (info) => {
      current = info;
    },
    setStage: (stage) => {
      if (current) current = { ...current, stage };
    },
  };
}
