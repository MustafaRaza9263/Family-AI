export type LimitsConfig = {
  dailyRuns: { image: number; video: number };
  perUserRunning: number;
  perUserQueued: number;
  globalQueued: number;
};

export const DEFAULT_LIMITS: LimitsConfig = {
  dailyRuns: { image: 100, video: 25 },
  perUserRunning: 1,
  perUserQueued: 3,
  globalQueued: 30,
};
