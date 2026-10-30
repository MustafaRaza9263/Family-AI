import { describe, expect, it } from 'vitest';
import { assertRecipeMatchRules } from '../../src/comfy/recipes/match-validation.js';
import { sampleManifest } from './helpers/sample-recipe.js';

describe('assertRecipeMatchRules', () => {
  it('accepts a single recipe', () => {
    expect(() => assertRecipeMatchRules([sampleManifest()])).not.toThrow();
  });

  it('rejects overlapping tool+count+variant', () => {
    const a = sampleManifest({ id: 'a' });
    const b = sampleManifest({
      id: 'b',
      match: {
        tool: 'image',
        inputImages: { min: 0, max: 0 },
        variant: { id: 'fast', label: 'Fast', default: true },
      },
    });
    expect(() => assertRecipeMatchRules([a, b])).toThrow(/both match/);
  });

  it('requires exactly one default among variants for same count', () => {
    const fast = sampleManifest({
      id: 'fast',
      match: {
        tool: 'image',
        inputImages: { min: 0, max: 0 },
        variant: { id: 'fast', label: 'Fast' },
      },
    });
    const best = sampleManifest({
      id: 'best',
      match: {
        tool: 'image',
        inputImages: { min: 0, max: 0 },
        variant: { id: 'best', label: 'Best' },
      },
    });
    expect(() => assertRecipeMatchRules([fast, best])).toThrow(/default: true/);
  });

  it('accepts two variants when one is default', () => {
    const fast = sampleManifest({
      id: 'fast',
      match: {
        tool: 'image',
        inputImages: { min: 0, max: 0 },
        variant: { id: 'fast', label: 'Fast', default: true },
      },
    });
    const best = sampleManifest({
      id: 'best',
      match: {
        tool: 'image',
        inputImages: { min: 0, max: 0 },
        variant: { id: 'best', label: 'Best' },
      },
    });
    expect(() => assertRecipeMatchRules([fast, best])).not.toThrow();
  });
});
