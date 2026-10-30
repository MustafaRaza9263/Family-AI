'use client';

import { Textarea } from '@/components/ui/textarea';

export function PromptField({
  value,
  maxLength = 1000,
  onChange,
  disabled,
}: {
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder="Describe what you want to create…"
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        aria-label="Prompt"
      />
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
