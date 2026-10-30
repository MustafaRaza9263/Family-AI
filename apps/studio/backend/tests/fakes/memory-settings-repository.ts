import type { LimitsOverrides } from '../../src/db/documents.js';
import type {
  SettingsRecord,
  SettingsRepository,
} from '../../src/db/repositories/settings-repository.js';

export class MemorySettingsRepository implements SettingsRepository {
  private record: SettingsRecord = {
    enginePaused: false,
    limits: {},
  };

  async get(): Promise<SettingsRecord> {
    return {
      enginePaused: this.record.enginePaused,
      limits: { ...this.record.limits },
    };
  }

  async setEnginePaused(paused: boolean): Promise<SettingsRecord> {
    this.record.enginePaused = paused;
    return this.get();
  }

  async setLimits(limits: LimitsOverrides): Promise<SettingsRecord> {
    this.record.limits = { ...limits };
    return this.get();
  }
}
