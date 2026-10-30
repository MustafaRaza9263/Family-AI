'use client';

import { PRODUCT_TAGLINE } from '@studio/shared';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';
import { Card } from '@/components/ui/card';
import { RedirectIfAuthed } from '@/features/auth/auth-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RedirectIfAuthed>
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <BrandMark size="lg" />
            <p className="text-sm text-muted-foreground">{PRODUCT_TAGLINE}</p>
          </div>
          <Card>{children}</Card>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
