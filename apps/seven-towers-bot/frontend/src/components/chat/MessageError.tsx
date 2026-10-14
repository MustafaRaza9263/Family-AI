"use client";

import { Button } from "@/components/ui/Button";

type MessageErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function MessageError({ message, onRetry }: MessageErrorProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-danger">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="ghost" className="px-2 py-1 text-danger" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
