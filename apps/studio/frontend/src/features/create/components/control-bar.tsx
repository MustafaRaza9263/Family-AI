'use client';

import type { ToolCapability } from '@studio/shared';
import { Plus, Settings2 } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import {
  getBarControls,
  listVariants,
  resolveMode,
  type ControlValue,
} from '../control-state';
import { AspectPill } from './aspect-pill';
import { ControlOption } from './control-option';
import { SubmitButton } from './submit-button';
import { VariantControl } from './variant-control';

function looksLikeAspect(control: { type: string; options?: { value: string }[] }) {
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
  canAttach,
  attachDisabled,
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
  canAttach: boolean;
  attachDisabled?: boolean;
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
  const settings = controls.filter((c) => c !== aspect);
  const warnChars = promptLength > promptMax * 0.8;
  const meta = warnChars
    ? `${promptLength}/${promptMax}`
    : `${quotaRemaining} left`;
  const hasImages = inputImageCount > 0;
  // Quality only applies to create (0 images).
  const showQuality = variants.length > 1 && !hasImages;

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5">
      {canAttach ? (
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

      {settings.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="size-[34px] rounded-full p-0">
              <Settings2 className="size-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="space-y-3">
            {settings.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <ControlOption
                  control={c}
                  value={values[c.id] ?? c.default}
                  onChange={(v) => onValueChange(c.id, v)}
                />
              </div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}

      <div className="flex-1" />

      <span
        className={cn(
          'hidden px-1.5 text-xs text-muted-foreground tabular-nums sm:inline',
          warnChars && 'text-warning',
        )}
        data-tip={`${quotaRemaining} of ${quotaDaily} images left today`}
        data-tip-align="end"
      >
        {meta}
      </span>

      <SubmitButton disabled={sendDisabled} loading={sending} />
    </div>
  );
}
