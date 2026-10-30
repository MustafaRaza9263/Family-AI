import type { LimitsOverrides } from '../documents.js';

export type SettingsRecord = {
  enginePaused: boolean;
  limits: LimitsOverrides;
};

export interface SettingsRepository {
  get(): Promise<SettingsRecord>;
  setEnginePaused(paused: boolean): Promise<SettingsRecord>;
  setLimits(limits: LimitsOverrides): Promise<SettingsRecord>;
}
