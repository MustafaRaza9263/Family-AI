import { describe, expect, it } from 'vitest';
import { pickMode } from '@studio/shared';

describe('pickMode', () => {
  const modes = [
    {
      id: 'fast',
      inputImages: { min: 0, max: 0 },
      variant: { id: 'fast', default: true },
    },
    {
      id: 'best',
      inputImages: { min: 0, max: 0 },
      variant: { id: 'best' },
    },
    {
      id: 'edit',
      inputImages: { min: 1, max: 1 },
    },
    {
      id: 'ref',
      inputImages: { min: 2, max: 4 },
    },
  ] as const;

  it('picks default variant when variantId omitted', () => {
    expect(pickMode(modes, { inputImageCount: 0 })?.id).toBe('fast');
  });

  it('picks explicit variant', () => {
    expect(
      pickMode(modes, { inputImageCount: 0, variantId: 'best' })?.id,
    ).toBe('best');
  });

  it('picks edit for one image', () => {
    expect(pickMode(modes, { inputImageCount: 1 })?.id).toBe('edit');
  });

  it('picks reference for 2–4 images', () => {
    expect(pickMode(modes, { inputImageCount: 3 })?.id).toBe('ref');
  });

  it('returns undefined when nothing matches', () => {
    expect(pickMode(modes, { inputImageCount: 5 })).toBeUndefined();
  });

  it('ignores a variant that does not exist at this count', () => {
    expect(
      pickMode(modes, { inputImageCount: 1, variantId: 'best' })?.id,
    ).toBe('edit');
  });
});
