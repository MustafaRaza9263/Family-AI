import { describe, expect, it } from 'vitest';
import {
  createHardwareAccum,
  finalizeHardware,
  foldSample,
} from '../../src/telemetry/aggregates.js';
import type { HardwareSample } from '../../src/telemetry/types.js';

function sample(partial: Partial<HardwareSample>): HardwareSample {
  return {
    at: new Date(0),
    gpuUtilPct: null,
    powerW: null,
    tempC: null,
    memUsedMb: null,
    memAvailableMb: null,
    swapUsedMb: null,
    memTotalMb: null,
    ...partial,
  };
}

describe('hardware aggregates', () => {
  it('returns null aggregates when there are no valid samples', () => {
    const accum = createHardwareAccum();
    expect(finalizeHardware(accum)).toMatchObject({
      samples: 0,
      gpuUtilAvg: null,
      gpuUtilPeak: null,
      memUsedAvgMb: null,
      gpuAvailable: false,
    });
  });

  it('handles a single sample', () => {
    const accum = createHardwareAccum();
    foldSample(
      accum,
      sample({
        gpuUtilPct: 50,
        powerW: 200,
        tempC: 70,
        memUsedMb: 1000,
        memAvailableMb: 2000,
        swapUsedMb: 10,
        memTotalMb: 3000,
      }),
    );
    expect(finalizeHardware(accum)).toEqual({
      samples: 1,
      gpuUtilAvg: 50,
      gpuUtilPeak: 50,
      powerAvgW: 200,
      powerPeakW: 200,
      tempPeakC: 70,
      memUsedAvgMb: 1000,
      memUsedPeakMb: 1000,
      memAvailableMinMb: 2000,
      swapUsedStartMb: 10,
      swapUsedPeakMb: 10,
      memTotalMb: 3000,
      gpuAvailable: true,
    });
  });

  it('aggregates many samples', () => {
    const accum = createHardwareAccum();
    foldSample(accum, sample({ gpuUtilPct: 10, memUsedMb: 100, swapUsedMb: 5 }));
    foldSample(accum, sample({ gpuUtilPct: 30, memUsedMb: 300, swapUsedMb: 20 }));
    foldSample(accum, sample({ gpuUtilPct: 20, memUsedMb: 200, swapUsedMb: 10 }));
    const summary = finalizeHardware(accum);
    expect(summary.samples).toBe(3);
    expect(summary.gpuUtilAvg).toBeCloseTo(20);
    expect(summary.gpuUtilPeak).toBe(30);
    expect(summary.memUsedAvgMb).toBeCloseTo(200);
    expect(summary.memUsedPeakMb).toBe(300);
    expect(summary.swapUsedStartMb).toBe(5);
    expect(summary.swapUsedPeakMb).toBe(20);
  });
});
