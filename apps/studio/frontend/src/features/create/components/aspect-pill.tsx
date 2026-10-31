'use client';

import type { ModeControl } from '@studio/shared';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { AspectGlyph } from '@/lib/icons';
import type { ControlValue } from '../control-state';

function aspectName(label: string, value: string): string {
  const stripped = label.replace(value, '').trim();
  return stripped || label;
}

export function AspectPill({
  control,
  value,
  onChange,
}: {
  control: ModeControl;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
}) {
  const options = control.options ?? [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = String(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (options.length === 0) return null;

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={control.label}
      className={cn(
        'inline-flex h-[34px] items-center gap-0.5 rounded-full border border-border bg-background p-0.5',
        open && 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_25%,transparent)]',
      )}
    >
      {options.map((opt) => {
        const on = opt.value === selected;
        const name = aspectName(opt.label, opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            // Tip sits on the button; overflow lives on the inner span so ::after is not clipped.
            data-tip={on && !open ? name : undefined}
            aria-label={`${name} ${opt.value}`}
            onClick={() => {
              if (!open) {
                setOpen(true);
                return;
              }
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              'inline-flex h-[26px] items-center justify-center rounded-full transition-[color,background,box-shadow,opacity,max-width,padding,min-width] duration-300',
              on
                ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
                : 'text-muted-foreground hover:text-foreground',
              !open && !on && 'pointer-events-none max-w-0 min-w-0 px-0 opacity-0',
              (open || on) && 'max-w-20 min-w-7 px-1.5',
            )}
          >
            <span className="inline-flex items-center justify-center gap-1.5 overflow-hidden">
              <AspectGlyph value={opt.value} />
              {on ? (
                <span className="font-mono text-[11px] font-semibold tracking-wide">
                  {opt.value}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
