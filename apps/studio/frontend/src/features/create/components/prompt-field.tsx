'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { extractImageFiles } from '../attachments/extract-image-files';

export function PromptField({
  value,
  maxLength = 1000,
  placeholder,
  onChange,
  disabled,
  onPasteFiles,
  onSubmitRequest,
}: {
  value: string;
  maxLength?: number;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onPasteFiles?: (files: File[]) => void;
  /** Enter (without Shift) submits. */
  onSubmitRequest?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), 180)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      maxLength={maxLength}
      disabled={disabled}
      rows={1}
      aria-label="Prompt"
      placeholder={placeholder ?? 'Describe the image you want'}
      className={cn(
        'scrollbar-none block w-full resize-none overflow-y-auto border-0 bg-transparent shadow-none ring-0',
        'px-2 py-1.5 pb-2 text-[15px] leading-snug text-foreground',
        'outline-none',
        'min-h-6 max-h-[180px] placeholder:text-muted-foreground',
      )}
      onChange={(e) => onChange(e.target.value)}
      onPaste={(e) => {
        if (!onPasteFiles) return;
        const files = extractImageFiles(e.clipboardData);
        if (files.length > 0) {
          e.preventDefault();
          onPasteFiles(files);
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        onSubmitRequest?.();
      }}
    />
  );
}
