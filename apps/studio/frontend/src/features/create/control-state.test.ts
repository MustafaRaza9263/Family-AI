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
  attachments: { max: 4 },
  modes: [
    {
      inputImages: { min: 0, max: 0 },
      label: 'Create',
      placeholder: 'Describe the image you want',
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
      label: 'Create',
      placeholder: 'Describe the image you want',
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
    {
      inputImages: { min: 1, max: 1 },
      label: 'Edit',
      placeholder: 'Describe the change you want',
      controls: [
        {
          id: 'prompt',
          type: 'text',
          label: 'Prompt',
          group: 'primary',
          default: '',
        },
      ],
    },
    {
      inputImages: { min: 2, max: 4 },
      label: 'Combine',
      placeholder: 'Describe how to combine them',
      controls: [
        {
          id: 'prompt',
          type: 'text',
          label: 'Prompt',
          group: 'primary',
          default: '',
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
    expect(mode?.label).toBe('Create');
    expect(getPromptControl(mode)?.id).toBe('prompt');
    expect(getBarControls(mode).map((c) => c.id)).toEqual(['aspectRatio']);
    expect(defaultValues(mode)).toEqual({ aspectRatio: '1:1' });
  });

  it('lists variants only for zero attachments', () => {
    expect(listVariants(tool, 0).map((v) => v.id)).toEqual(['fast', 'best']);
    expect(listVariants(tool, 1)).toEqual([]);
  });

  it('picks Edit / Combine by attachment count', () => {
    expect(resolveMode(tool, 1)?.label).toBe('Edit');
    expect(resolveMode(tool, 3)?.label).toBe('Combine');
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
