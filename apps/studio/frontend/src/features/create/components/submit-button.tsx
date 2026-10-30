'use client';

import { Button } from '@/components/ui/button';

export function SubmitButton({
  disabled,
  loading,
  reason,
}: {
  disabled?: boolean;
  loading?: boolean;
  reason?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="submit" disabled={disabled} loading={loading}>
        Generate
      </Button>
      {disabled && reason ? (
        <p className="text-xs text-muted-foreground">{reason}</p>
      ) : null}
    </div>
  );
}
