import { describe, expect, it, beforeEach } from 'vitest';
import type { ToolCapability } from '@studio/shared';
import {
  defaultValues,
  getBarControls,
  getPromptControl,
  listVariants,
  loadPrefs,
  resolveMode,
  savePrefs,
  storageKey,
} from './control-state';

const tool: ToolCapability = {
  id: 'image',
  label: 'Image',
  attachments: { max: 0 },
  modes: [
    {
      inputImages: { min: 0, max: 0 },
      variant: { id: 'fast', label: 'Fast', default: true },
      controls: [
        {
          id: 'prompt',
          type: 'text',
          label: 'Prompt',
          group: 'primary',
          default: '',
          maxLength: 1000,
        },
        {
          id: 'aspectRatio',
          type: 'enum',
          label: 'Aspect ratio',
          group: 'primary',
          default: '1:1',
          options: [
            { value: '1:1', label: 'Square' },
            { value: '16:9', label: 'Wide' },
          ],
        },
      ],
    },
    {
      inputImages: { min: 0, max: 0 },
      variant: { id: 'best', label: 'Best quality' },
      controls: [
        {
          id: 'prompt',
          type: 'text',
          label: 'Prompt',
          group: 'primary',
          default: '',
        },
        {
          id: 'aspectRatio',
          type: 'enum',
          label: 'Aspect ratio',
          group: 'primary',
          default: '1:1',
          options: [{ value: '1:1', label: 'Square' }],
        },
      ],
    },
  ],
};

describe('control-state', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  it('resolves mode via pickMode and splits prompt from bar controls', () => {
    const mode = resolveMode(tool, 0, 'fast');
    expect(mode?.variant?.id).toBe('fast');
    expect(getPromptControl(mode)?.id).toBe('prompt');
    expect(getBarControls(mode).map((c) => c.id)).toEqual(['aspectRatio']);
    expect(defaultValues(mode)).toEqual({ aspectRatio: '1:1' });
  });

  it('lists variants for the current attachment count', () => {
    expect(listVariants(tool, 0).map((v) => v.id)).toEqual(['fast', 'best']);
  });

  it('persists prefs per tool', () => {
    savePrefs('image', { variantId: 'best', values: { aspectRatio: '16:9' } });
    expect(loadPrefs('image')).toEqual({
      variantId: 'best',
      values: { aspectRatio: '16:9' },
    });
    expect(storageKey('image')).toBe('studio.controls.image');
  });
});
