import { describe, expect, it, vi } from 'vitest';
import { continueFromLastFrame } from './continue-from-video';

describe('continueFromLastFrame', () => {
  it('calls extract at last and builds a Start attachment', async () => {
    const extract = vi.fn(async () => ({ asset: { id: 'frame-9' } }));
    const item = await continueFromLastFrame('video-1', extract);
    expect(extract).toHaveBeenCalledWith('video-1', 'last');
    expect(item.assetId).toBe('frame-9');
    expect(item.key).toBe('start-frame-9');
    expect(item.uploading).toBe(false);
    expect(item.previewUrl).toContain('/api/files/frame-9');
  });
});
