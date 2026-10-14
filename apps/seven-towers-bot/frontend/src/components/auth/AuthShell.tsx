"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { APP_NAME } from "@/lib/config";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-center text-2xl font-semibold text-text">
          {APP_NAME}
        </h1>
        <Card>{children}</Card>
      </div>
    </div>
  );
}
