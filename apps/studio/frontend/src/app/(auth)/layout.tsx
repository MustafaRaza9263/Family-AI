'use client';

import { PRODUCT_TAGLINE } from '@studio/shared';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';
import { Card } from '@/components/ui/card';
import { RedirectIfAuthed } from '@/features/auth/auth-guard';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RedirectIfAuthed>
      <div
        className="flex min-h-dvh items-center justify-center px-4 py-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(108,140,255,0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(139,92,246,0.14), transparent 35%)',
        }}
      >
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <BrandMark className="justify-center" size="lg" />
            <p className="text-sm text-muted-foreground">{PRODUCT_TAGLINE}</p>
          </div>
          <Card>{children}</Card>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
