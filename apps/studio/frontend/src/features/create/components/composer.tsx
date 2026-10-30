'use client';

import type { ToolCapability } from '@studio/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  defaultValues,
  getPromptControl,
  listVariants,
  loadPrefs,
  resolveMode,
  savePrefs,
  type ControlValue,
} from '../control-state';
import { ControlBar } from './control-bar';
import { PromptField } from './prompt-field';
import { SubmitButton } from './submit-button';

export type ComposerSubmit = {
  prompt: string;
  values: Record<string, ControlValue>;
  variant?: string;
  inputAssetIds: string[];
};

export function Composer({
  tool,
  engineState,
  quota,
  disabled,
  submitting,
  onSubmit,
}: {
  tool: ToolCapability;
  engineState: 'ready' | 'paused' | 'unavailable';
  quota: { dailyRuns: number; remaining: number };
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (data: ComposerSubmit) => void | Promise<void>;
}) {
  const inputImageCount = 0;
  const variants = listVariants(tool, inputImageCount);
  const prefs = useMemo(() => loadPrefs(tool.id), [tool.id]);

  const [prompt, setPrompt] = useState('');
  const [variantId, setVariantId] = useState<string | undefined>(
    prefs?.variantId ?? variants.find((v) => v.default)?.id ?? variants[0]?.id,
  );
  const mode = resolveMode(tool, inputImageCount, variantId);
  const [values, setValues] = useState<Record<string, ControlValue>>(
    () => ({ ...defaultValues(mode), ...prefs?.values }),
  );

  useEffect(() => {
    savePrefs(tool.id, { variantId, values });
  }, [tool.id, variantId, values]);

  const promptControl = getPromptControl(mode);
  const exhausted = quota.remaining <= 0;
  const unavailable = engineState === 'unavailable';
  const blockReason = exhausted
    ? 'Daily quota used up'
    : unavailable
      ? 'Engine unavailable'
      : !prompt.trim()
        ? 'Enter a prompt'
        : undefined;

  const slots = [
    <PromptField
      key="prompt"
      value={prompt}
      maxLength={promptControl?.maxLength ?? 1000}
      onChange={setPrompt}
      disabled={disabled}
    />,
    <ControlBar
      key="controls"
      tool={tool}
      inputImageCount={inputImageCount}
      variantId={variantId}
      values={values}
      onVariantChange={setVariantId}
      onValueChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
    />,
  ];

  return (
    <form
      className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (blockReason || submitting) return;
        void onSubmit({
          prompt: prompt.trim(),
          values,
          variant: variantId,
          inputAssetIds: [],
        });
        setPrompt('');
      }}
    >
      {slots}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            {quota.remaining} of {quota.dailyRuns} {tool.label.toLowerCase()}s
            left today
          </p>
          {engineState === 'paused' ? (
            <p>
              Paused by an admin — your request will start when it resumes.
            </p>
          ) : null}
        </div>
        <SubmitButton
          disabled={Boolean(blockReason) || disabled}
          loading={submitting}
          reason={blockReason}
        />
      </div>
    </form>
  );
}
