import type { JobTool } from '../documents.js';

export type UsageDailyRecord = {
  id: string;
  userId: string;
  day: string;
  tool: JobTool;
  runs: number;
  gpuSeconds: number;
};

export interface UsageDailyRepository {
  /**
   * Atomically increment runs only while runs < maxRuns.
   * Returns the updated row, or null if the limit was already reached.
   */
  tryIncrementRuns(
    userId: string,
    day: string,
    tool: JobTool,
    maxRuns: number,
  ): Promise<UsageDailyRecord | null>;

  refundRun(userId: string, day: string, tool: JobTool): Promise<void>;

  addGpuSeconds(
    userId: string,
    day: string,
    tool: JobTool,
    seconds: number,
  ): Promise<void>;

  find(
    userId: string,
    day: string,
    tool: JobTool,
  ): Promise<UsageDailyRecord | null>;
}
