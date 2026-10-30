import type { Env } from '../config/env.js';

export type TelemetryConfig = {
  enabled: boolean;
  sampleIntervalMs: number;
  retentionDays: number;
};

export const defaultTelemetryConfig: TelemetryConfig = {
  enabled: true,
  sampleIntervalMs: 1000,
  retentionDays: 90,
};

export function telemetryConfigFromEnv(env: Env): TelemetryConfig {
  return {
    enabled: env.TELEMETRY_ENABLED,
    sampleIntervalMs: env.TELEMETRY_SAMPLE_INTERVAL_MS,
    retentionDays: env.TELEMETRY_RETENTION_DAYS,
  };
}
