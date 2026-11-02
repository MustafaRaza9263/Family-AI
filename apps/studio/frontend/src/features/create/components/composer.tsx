'use client';

import type { ToolCapability } from '@studio/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
  getBarControls,
  getPromptControl,
  listVariants,
  loadPrefs,
  resolveMode,
  savePrefs,
  type ControlValue,
} from '../control-state';
import { nearestAspect } from '../nearest-aspect';
import { toolUi } from '../tool-ui';
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
  const ui = toolUi(tool.id);
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
  // Video: Start/End slots stay hidden until the frames icon is opened (or seeded).
  const [framesOpen, setFramesOpen] = useState(
    () => ui.attachmentStyle === 'slots' && initialAttachments.length > 0,
  );
  const aspectTouched = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const promptMax = promptControl?.maxLength ?? 2000;
  const maxAttach = tool.attachments.max;
  const uploading = hasUploading(attachState);
  const slotLabels =
    mode?.slots?.map((s) => s.label) ??
    tool.attachments.slots?.map((s) => s.label) ??
    [];
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

  const maybePreselectAspect = (size: { width: number; height: number }) => {
    if (aspectTouched.current) return;
    const aspectControl = getBarControls(mode).find(
      (c) =>
        c.type === 'enum' &&
        c.options?.every((opt) => /^\d+:\d+$/.test(opt.value)),
    );
    if (!aspectControl?.options?.length) return;
    const next = nearestAspect(
      size.width,
      size.height,
      aspectControl.options.map((o) => o.value),
    );
    setValues((prev) => ({ ...prev, [aspectControl.id]: next }));
  };

  // Video: nearest aspect on first attach (or seeded Start frame), unless user changed it.
  useEffect(() => {
    if (ui.attachmentStyle !== 'slots') return;
    const first = initialAttachments[0];
    if (!first?.previewUrl || aspectTouched.current) return;
    const img = new Image();
    img.onload = () => {
      if (aspectTouched.current) return;
      maybePreselectAspect({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = first.previewUrl;
    // Only seed once from the mount-time attachments.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount seed
  }, []);

  const addFiles = (files: File[]) =>
    enqueueUploads(files, {
      max: maxAttach,
      currentCount: attachState.items.length,
      dispatch,
      onFirstAssetSize:
        ui.attachmentStyle === 'slots' ? maybePreselectAspect : undefined,
    });

  const clearAttachments = () => {
    if (attachState.items.some((i) => i.working)) onWorkingDismiss?.();
    dispatch({ type: 'clear' });
    onAttachmentsClear?.();
    if (ui.attachmentStyle === 'slots') setFramesOpen(false);
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
    ui.attachmentStyle === 'slots'
      ? inputImageCount === 0
        ? undefined
        : inputImageCount === 1
          ? 'Describe how the start frame comes alive'
          : 'Describe how the first frame becomes the last'
      : inputImageCount > 1
        ? `${inputImageCount} of ${maxAttach} attached · in your prompt, refer to them as image 1, image 2, and so on`
        : inputImageCount === 1
          ? 'Describe what to change'
          : undefined;

  const slotsStyle = ui.attachmentStyle === 'slots';
  const showTray = slotsStyle
    ? framesOpen || attachState.items.length > 0
    : attachState.items.length > 0;

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
      <AnimatePresence initial={false}>
        {showTray ? (
          <motion.div
            key="attach-tray"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <AttachmentTray
              items={attachState.items}
              modeLabel={mode?.label}
              modeHint={modeHint}
              attachmentStyle={ui.attachmentStyle}
              slotLabels={slotLabels}
              attachDisabled={inputImageCount >= maxAttach || disabled}
              onRemove={(key) => {
                const item = attachState.items.find((i) => i.key === key);
                dispatch({ type: 'remove', key });
                if (item?.working) onWorkingDismiss?.();
                onAttachmentRemove?.(key);
              }}
              onClear={clearAttachments}
              onAddSlot={() => fileRef.current?.click()}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
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
        quotaNoun={ui.quotaNoun}
        canAttach={maxAttach > 0 && !slotsStyle}
        attachDisabled={inputImageCount >= maxAttach || disabled}
        framesMode={slotsStyle && maxAttach > 0}
        framesOpen={showTray}
        onFramesToggle={() => {
          if (attachState.items.length > 0) {
            setFramesOpen(true);
            return;
          }
          setFramesOpen((open) => !open);
        }}
        sendDisabled={Boolean(disabled || blockReason)}
        sending={submitting}
        onVariantChange={setVariantId}
        onValueChange={(id, v) => {
          if (id === 'aspectRatio') aspectTouched.current = true;
          setValues((prev) => ({ ...prev, [id]: v }));
        }}
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
