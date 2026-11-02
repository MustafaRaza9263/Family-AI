'use client';

import type { ToolCapability } from '@studio/shared';
import { Images, Plus } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/cn';
import {
  getBarControls,
  listVariants,
  resolveMode,
  type ControlValue,
} from '../control-state';
import { AspectPill } from './aspect-pill';
import { EnumPill } from './enum-pill';
import { SubmitButton } from './submit-button';
import { VariantControl } from './variant-control';

function looksLikeAspect(control: {
  type: string;
  options?: { value: string }[];
}) {
  return (
    control.type === 'enum' &&
    Boolean(control.options?.length) &&
    control.options!.every((opt) => /^\d+:\d+$/.test(opt.value))
  );
}

export function ControlBar({
  tool,
  inputImageCount,
  variantId,
  values,
  promptLength,
  promptMax,
  quotaRemaining,
  quotaDaily,
  quotaNoun = 'images',
  canAttach,
  attachDisabled,
  framesMode,
  framesOpen,
  onFramesToggle,
  sendDisabled,
  sending,
  onVariantChange,
  onValueChange,
  onPickFiles,
}: {
  tool: ToolCapability;
  inputImageCount: number;
  variantId?: string;
  values: Record<string, ControlValue>;
  promptLength: number;
  promptMax: number;
  quotaRemaining: number;
  quotaDaily: number;
  quotaNoun?: string;
  canAttach: boolean;
  attachDisabled?: boolean;
  /** Video: frames icon toggles Start/End slots instead of a plain +. */
  framesMode?: boolean;
  framesOpen?: boolean;
  onFramesToggle?: () => void;
  sendDisabled?: boolean;
  sending?: boolean;
  onVariantChange: (id: string) => void;
  onValueChange: (id: string, value: ControlValue) => void;
  onPickFiles: (files: FileList | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const variants = listVariants(tool, inputImageCount);
  const mode = resolveMode(tool, inputImageCount, variantId);
  const controls = getBarControls(mode);
  const aspect = controls.find(looksLikeAspect);
  // Quality / duration stay in the bar — no settings popup.
  const inlineEnums = controls.filter((c) => c !== aspect && c.type === 'enum');
  const warnChars = promptLength > promptMax * 0.8;
  const meta = warnChars
    ? `${promptLength}/${promptMax}`
    : `${quotaRemaining} of ${quotaDaily} ${quotaNoun} left today`;
  const hasImages = inputImageCount > 0;
  const showQuality = variants.length > 1 && !hasImages;

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5">
      {framesMode ? (
        <button
          type="button"
          className={cn(
            'grid size-[34px] place-items-center rounded-full border border-border transition duration-200',
            framesOpen
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
          )}
          aria-label="Frames"
          aria-pressed={framesOpen}
          data-tip="Start and end frames"
          onClick={onFramesToggle}
        >
          <Images className="size-[18px]" strokeWidth={2} />
        </button>
      ) : canAttach ? (
        <>
          <button
            type="button"
            className={cn(
              'grid size-[34px] place-items-center rounded-full border border-border text-muted-foreground transition duration-200',
              'hover:bg-surface-muted hover:text-foreground',
              attachDisabled && 'cursor-not-allowed opacity-35',
            )}
            aria-label="Add image"
            data-tip="Add image · edit or use as reference"
            disabled={attachDisabled}
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="size-[18px]" strokeWidth={2} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </>
      ) : null}

      {aspect ? (
        <AspectPill
          control={aspect}
          value={values[aspect.id] ?? aspect.default}
          onChange={(v) => onValueChange(aspect.id, v)}
        />
      ) : null}

      {showQuality ? (
        <VariantControl
          variants={variants}
          value={variantId}
          onChange={onVariantChange}
        />
      ) : null}

      {inlineEnums.map((c) => (
        <EnumPill
          key={c.id}
          control={c}
          value={values[c.id] ?? c.default}
          onChange={(v) => onValueChange(c.id, v)}
        />
      ))}

      <div className="flex-1" />

      <span
        className={cn(
          'hidden px-1.5 text-xs text-muted-foreground tabular-nums sm:inline',
          warnChars && 'text-warning',
        )}
        data-tip={`${quotaRemaining} of ${quotaDaily} ${quotaNoun} left today`}
        data-tip-align="end"
      >
        {meta}
      </span>

      <SubmitButton disabled={sendDisabled} loading={sending} />
    </div>
  );
}
