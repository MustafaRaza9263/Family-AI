import {
  pickMode,
  type ModeControl,
  type ToolCapability,
  type ToolMode,
} from '@studio/shared';
import { readJsonStorage, writeJsonStorage } from '@/lib/storage';

export type ControlValue = string | number | boolean;
export type ControlPrefs = {
  variantId?: string;
  values: Record<string, ControlValue>;
};

export function storageKey(tool: string): string {
  return `studio.controls.${tool}`;
}

export function loadPrefs(tool: string): ControlPrefs | null {
  return readJsonStorage<ControlPrefs>(storageKey(tool));
}

export function savePrefs(tool: string, prefs: ControlPrefs): void {
  writeJsonStorage(storageKey(tool), prefs);
}

export function getPromptControl(mode: ToolMode | undefined): ModeControl | undefined {
  return mode?.controls.find((c) => c.id === 'prompt' && c.type === 'text');
}

export function getBarControls(mode: ToolMode | undefined): ModeControl[] {
  return (mode?.controls ?? []).filter((c) => c.id !== 'prompt');
}

export function matchingModes(
  tool: ToolCapability,
  inputImageCount: number,
): ToolMode[] {
  return tool.modes.filter(
    (m) =>
      inputImageCount >= m.inputImages.min &&
      inputImageCount <= m.inputImages.max,
  );
}

export function listVariants(tool: ToolCapability, inputImageCount: number) {
  return matchingModes(tool, inputImageCount)
    .map((m) => m.variant)
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
}

export function resolveMode(
  tool: ToolCapability,
  inputImageCount: number,
  variantId?: string,
): ToolMode | undefined {
  return pickMode(tool.modes, { inputImageCount, variantId });
}

export function defaultValues(mode: ToolMode | undefined): Record<string, ControlValue> {
  const values: Record<string, ControlValue> = {};
  for (const c of getBarControls(mode)) {
    values[c.id] = c.default;
  }
  return values;
}
