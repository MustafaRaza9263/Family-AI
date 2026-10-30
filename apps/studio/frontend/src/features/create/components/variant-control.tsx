'use client';

import type { ToolMode } from '@studio/shared';
import { Segmented } from '@/components/ui/segmented';
import { resolveIcon } from '@/lib/icons';

type Variant = NonNullable<ToolMode['variant']>;

export function VariantControl({
  variants,
  value,
  onChange,
}: {
  variants: Variant[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  if (variants.length <= 1) return null;

  return (
    <Segmented
      aria-label="Quality"
      value={value ?? variants[0]!.id}
      onChange={onChange}
      options={variants.map((v) => {
        const Icon = resolveIcon(v.icon);
        return {
          value: v.id,
          label: v.label,
          icon: <Icon className="size-3.5" />,
        };
      })}
    />
  );
}
