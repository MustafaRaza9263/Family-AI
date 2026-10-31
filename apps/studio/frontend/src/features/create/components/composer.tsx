'use client';

import type { ToolCapability } from '@studio/shared';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { AttachmentTray } from '../attachments/attachment-tray';
import { enqueueUploads } from '../attachments/enqueue-uploads';
import { extractImageFiles } from '../attachments/extract-image-files';
import {
  attachmentsReducer,
  hasUploading,
  readyAssetIds,
} from '../attachments/reducer';
import type { AttachmentItem } from '../attachments/types';
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
  initialAttachments = [],
  initialPrompt = '',
  onWorkingDismiss,
  onAttachmentRemove,
  onAttachmentsClear,
}: {
  tool: ToolCapability;
  engineState: 'ready' | 'paused' | 'unavailable';
  quota: { dailyRuns: number; remaining: number };
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (data: ComposerSubmit) => void | Promise<void>;
  /** Remount (via key) when this seed set should replace local tray state. */
  initialAttachments?: AttachmentItem[];
  /** Seeded when remounting after Edit prompt. */
  initialPrompt?: string;
  onWorkingDismiss?: () => void;
  /** Fired after a tray thumb is removed (key = attachment key). */
  onAttachmentRemove?: (key: string) => void;
  /** Fired when Clear empties the tray. */
  onAttachmentsClear?: () => void;
}) {
  const prefs = useMemo(() => loadPrefs(tool.id), [tool.id]);
  const [attachState, dispatch] = useReducer(
    attachmentsReducer,
    initialAttachments,
    (items) => ({ items, dismissedWorking: false }),
  );
  const inputImageCount = attachState.items.length;
  const variants = listVariants(tool, inputImageCount);
  const showVariant = variants.length > 1;
  const [dragging, setDragging] = useState(false);

  const [prompt, setPrompt] = useState(initialPrompt);
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

  // External file drags often skip dragleave; clear highlight on drag end.
  useEffect(() => {
    if (!dragging) return;
    const clear = () => setDragging(false);
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
    };
  }, [dragging]);

  const promptControl = getPromptControl(mode);
  const promptMax = promptControl?.maxLength ?? 1000;
  const maxAttach = tool.attachments.max;
  const uploading = hasUploading(attachState);
  const blockReason =
    quota.remaining <= 0
      ? 'Daily quota used up'
      : engineState === 'unavailable'
        ? 'Engine unavailable'
        : !prompt.trim()
          ? 'Enter a prompt'
          : uploading
            ? 'Waiting for uploads'
            : undefined;

  const addFiles = (files: File[]) =>
    enqueueUploads(files, {
      max: maxAttach,
      currentCount: attachState.items.length,
      dispatch,
    });

  const clearAttachments = () => {
    if (attachState.items.some((i) => i.working)) onWorkingDismiss?.();
    dispatch({ type: 'clear' });
    onAttachmentsClear?.();
  };

  const submit = () => {
    if (submitting) return;
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    void onSubmit({
      prompt: prompt.trim(),
      values,
      variant: showVariant ? variantId : undefined,
      inputAssetIds: readyAssetIds(attachState),
    });
    setPrompt('');
  };

  const modeHint =
    inputImageCount > 1
      ? `${inputImageCount} of ${maxAttach} attached · in your prompt, refer to them as image 1, image 2, and so on`
      : inputImageCount === 1
        ? 'Describe what to change'
        : undefined;

  return (
    <form
      data-dragging={dragging || undefined}
      className={cn(
        'composer-shell w-full min-w-0 max-w-full rounded-[22px]',
        'border border-border bg-composer p-2.5 pb-2 shadow-none outline-none',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(extractImageFiles(e.dataTransfer));
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <AttachmentTray
        items={attachState.items}
        modeLabel={mode?.label}
        modeHint={modeHint}
        onRemove={(key) => {
          const item = attachState.items.find((i) => i.key === key);
          dispatch({ type: 'remove', key });
          if (item?.working) onWorkingDismiss?.();
          onAttachmentRemove?.(key);
        }}
        onClear={clearAttachments}
      />
      <PromptField
        value={prompt}
        maxLength={promptMax}
        placeholder={mode?.placeholder}
        onChange={setPrompt}
        disabled={disabled}
        onPasteFiles={addFiles}
        onSubmitRequest={submit}
      />
      <ControlBar
        tool={tool}
        inputImageCount={inputImageCount}
        variantId={variantId}
        values={values}
        promptLength={prompt.length}
        promptMax={promptMax}
        quotaRemaining={quota.remaining}
        quotaDaily={quota.dailyRuns}
        canAttach={maxAttach > 0}
        attachDisabled={inputImageCount >= maxAttach || disabled}
        sendDisabled={Boolean(disabled || blockReason)}
        sending={submitting}
        onVariantChange={setVariantId}
        onValueChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
        onPickFiles={(list) => {
          if (list) addFiles(Array.from(list));
        }}
      />
      {engineState === 'paused' ? (
        <p className="px-2 pt-1 text-xs text-muted-foreground">
          Paused by an admin — your request will start when it resumes.
        </p>
      ) : null}
    </form>
  );
}
