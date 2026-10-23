import { describe, expect, it } from 'vitest';
import {
  imagesShownMarker,
  stripAttachmentMarkers,
} from '../../src/guardrails/attachment-markers';
import { guardOutput } from '../../src/guardrails/output.guard';

describe('attachment-markers', () => {
  it('builds a compact tag marker', () => {
    expect(imagesShownMarker(['harmony-type-b', 'location'])).toBe(
      '\n<images_shown>harmony-type-b, location</images_shown>',
    );
    expect(imagesShownMarker([])).toBe('');
  });

  it('strips legacy and tag markers from reply text', () => {
    const raw =
      'Here is the floor plan.\n[Shown to the user: image(s) harmony-type-b]\n' +
      'More text. <images_shown>location</images_shown>';
    expect(stripAttachmentMarkers(raw)).toBe(
      'Here is the floor plan.\nMore text.',
    );
  });
});

describe('guardOutput attachment markers', () => {
  it('strips markers before returning text to persist', async () => {
    const result = await guardOutput(
      'Floor plan ready.\n[Shown to the user: image(s) harmony-type-b]',
      'stop',
      'You are a helpful assistant.',
    );
    expect(result.text).toBe('Floor plan ready.');
    expect(result.emittedFallback).toBe(false);
  });
});
