import { describe, expect, it } from 'vitest';
import { TOOL_UI, toolUi } from './tool-ui';

describe('tool-ui registry', () => {
  it('exposes image and video entries with distinct styles', () => {
    expect(TOOL_UI.image.attachmentStyle).toBe('numbered');
    expect(TOOL_UI.video.attachmentStyle).toBe('slots');
    expect(TOOL_UI.image.newLabel).toBe('New image');
    expect(TOOL_UI.video.newLabel).toBe('New video');
    expect(TOOL_UI.image.quotaNoun).toBe('images');
    expect(TOOL_UI.video.quotaNoun).toBe('videos');
  });

  it('falls back unknown ids to image', () => {
    expect(toolUi('nope').id).toBe('image');
    expect(toolUi('video').id).toBe('video');
  });
});
