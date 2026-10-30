import { randomUUID } from 'node:crypto';
import type { JobTool } from '../../src/db/documents.js';
import type {
  UsageDailyRecord,
  UsageDailyRepository,
} from '../../src/db/repositories/usage-daily-repository.js';

function key(userId: string, day: string, tool: JobTool): string {
  return `${userId}|${day}|${tool}`;
}

export class MemoryUsageDailyRepository implements UsageDailyRepository {
  readonly rows = new Map<string, UsageDailyRecord>();

  async tryIncrementRuns(
    userId: string,
    day: string,
    tool: JobTool,
    maxRuns: number,
  ): Promise<UsageDailyRecord | null> {
    const k = key(userId, day, tool);
    let row = this.rows.get(k);
    if (!row) {
      row = {
        id: randomUUID(),
        userId,
        day,
        tool,
        runs: 0,
        gpuSeconds: 0,
      };
      this.rows.set(k, row);
    }
    if (row.runs >= maxRuns) return null;
    row.runs += 1;
    return { ...row };
  }

  async refundRun(userId: string, day: string, tool: JobTool): Promise<void> {
    const row = this.rows.get(key(userId, day, tool));
    if (row && row.runs > 0) row.runs -= 1;
  }

  async addGpuSeconds(
    userId: string,
    day: string,
    tool: JobTool,
    seconds: number,
  ): Promise<void> {
    const row = this.rows.get(key(userId, day, tool));
    if (row) row.gpuSeconds += seconds;
  }

  async find(
    userId: string,
    day: string,
    tool: JobTool,
  ): Promise<UsageDailyRecord | null> {
    const row = this.rows.get(key(userId, day, tool));
    return row ? { ...row } : null;
  }
}
