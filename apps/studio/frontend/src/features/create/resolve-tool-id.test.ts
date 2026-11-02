import { describe, expect, it } from 'vitest';
import { resolveToolId } from './resolve-tool-id';

describe('resolveToolId', () => {
  it('maps video and defaults everything else to image', () => {
    expect(resolveToolId('video')).toBe('video');
    expect(resolveToolId('image')).toBe('image');
    expect(resolveToolId(null)).toBe('image');
    expect(resolveToolId(undefined)).toBe('image');
    expect(resolveToolId('other')).toBe('image');
  });
});
