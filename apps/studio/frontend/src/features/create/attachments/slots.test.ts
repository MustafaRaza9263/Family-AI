import { describe, expect, it } from 'vitest';
import { shiftAfterRemove, visibleSlotLabels } from './slots';

describe('visibleSlotLabels', () => {
  const labels = ['Start frame', 'End frame'] as const;

  it('shows only Start when empty', () => {
    expect(visibleSlotLabels(labels, 0)).toEqual(['Start frame']);
  });

  it('shows End only after Start is filled', () => {
    expect(visibleSlotLabels(labels, 1)).toEqual([
      'Start frame',
      'End frame',
    ]);
  });

  it('keeps both labels when both filled', () => {
    expect(visibleSlotLabels(labels, 2)).toEqual([
      'Start frame',
      'End frame',
    ]);
  });
});

describe('shiftAfterRemove', () => {
  it('shifts later slots up when Start is removed', () => {
    expect(shiftAfterRemove(['start', 'end'], 0)).toEqual(['end']);
  });

  it('drops End without moving Start', () => {
    expect(shiftAfterRemove(['start', 'end'], 1)).toEqual(['start']);
  });
});
