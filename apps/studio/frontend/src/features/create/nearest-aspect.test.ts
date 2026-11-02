import { describe, expect, it } from 'vitest';
import { nearestAspect } from './nearest-aspect';

describe('nearestAspect', () => {
  const presets = ['1:1', '16:9', '9:16', '4:3'] as const;

  it('picks 16:9 for a wide image', () => {
    expect(nearestAspect(1920, 1080, presets)).toBe('16:9');
  });

  it('picks 9:16 for a tall image', () => {
    expect(nearestAspect(1080, 1920, presets)).toBe('9:16');
  });

  it('picks 1:1 for a square image', () => {
    expect(nearestAspect(512, 512, presets)).toBe('1:1');
  });

  it('falls back when dimensions are invalid', () => {
    expect(nearestAspect(0, 0, presets)).toBe('1:1');
  });
});
