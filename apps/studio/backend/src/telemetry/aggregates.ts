import type { HardwareSample, HardwareSummary } from './types.js';

export type NumericAccum = {
  count: number;
  sum: number;
  peak: number;
  min: number;
};

export type HardwareAccum = {
  samples: number;
  gpuUtil: NumericAccum;
  power: NumericAccum;
  temp: NumericAccum;
  memUsed: NumericAccum;
  memAvailable: NumericAccum;
  swapUsed: NumericAccum;
  swapUsedStartMb: number | null;
  memTotalMb: number | null;
  sawGpu: boolean;
};

export function createHardwareAccum(): HardwareAccum {
  return {
    samples: 0,
    gpuUtil: emptyAccum(),
    power: emptyAccum(),
    temp: emptyAccum(),
    memUsed: emptyAccum(),
    memAvailable: emptyAccum(),
    swapUsed: emptyAccum(),
    swapUsedStartMb: null,
    memTotalMb: null,
    sawGpu: false,
  };
}

function emptyAccum(): NumericAccum {
  return { count: 0, sum: 0, peak: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY };
}

function push(accum: NumericAccum, value: number): void {
  accum.count += 1;
  accum.sum += value;
  if (value > accum.peak) {
    accum.peak = value;
  }
  if (value < accum.min) {
    accum.min = value;
  }
}

function avg(accum: NumericAccum): number | null {
  return accum.count === 0 ? null : accum.sum / accum.count;
}

function peakOf(accum: NumericAccum): number | null {
  return accum.count === 0 ? null : accum.peak;
}

function minOf(accum: NumericAccum): number | null {
  return accum.count === 0 ? null : accum.min;
}

export function foldSample(accum: HardwareAccum, sample: HardwareSample): void {
  accum.samples += 1;
  if (sample.gpuUtilPct !== null) {
    push(accum.gpuUtil, sample.gpuUtilPct);
    accum.sawGpu = true;
  }
  if (sample.powerW !== null) {
    push(accum.power, sample.powerW);
    accum.sawGpu = true;
  }
  if (sample.tempC !== null) {
    push(accum.temp, sample.tempC);
    accum.sawGpu = true;
  }
  if (sample.memUsedMb !== null) {
    push(accum.memUsed, sample.memUsedMb);
  }
  if (sample.memAvailableMb !== null) {
    push(accum.memAvailable, sample.memAvailableMb);
  }
  if (sample.swapUsedMb !== null) {
    push(accum.swapUsed, sample.swapUsedMb);
    if (accum.swapUsedStartMb === null) {
      accum.swapUsedStartMb = sample.swapUsedMb;
    }
  }
  if (sample.memTotalMb !== null) {
    accum.memTotalMb = sample.memTotalMb;
  }
}

export function finalizeHardware(accum: HardwareAccum): HardwareSummary {
  return {
    samples: accum.samples,
    gpuUtilAvg: avg(accum.gpuUtil),
    gpuUtilPeak: peakOf(accum.gpuUtil),
    powerAvgW: avg(accum.power),
    powerPeakW: peakOf(accum.power),
    tempPeakC: peakOf(accum.temp),
    memUsedAvgMb: avg(accum.memUsed),
    memUsedPeakMb: peakOf(accum.memUsed),
    memAvailableMinMb: minOf(accum.memAvailable),
    swapUsedStartMb: accum.swapUsedStartMb,
    swapUsedPeakMb: peakOf(accum.swapUsed),
    memTotalMb: accum.memTotalMb,
    gpuAvailable: accum.sawGpu,
  };
}
