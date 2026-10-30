'use client';

import type { ToolCapability } from '@studio/shared';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getBarControls,
  listVariants,
  resolveMode,
  type ControlValue,
} from '../control-state';
import { ControlOption } from './control-option';
import { VariantControl } from './variant-control';

export function ControlBar({
  tool,
  inputImageCount,
  variantId,
  values,
  onVariantChange,
  onValueChange,
}: {
  tool: ToolCapability;
  inputImageCount: number;
  variantId?: string;
  values: Record<string, ControlValue>;
  onVariantChange: (id: string) => void;
  onValueChange: (id: string, value: ControlValue) => void;
}) {
  const variants = listVariants(tool, inputImageCount);
  const mode = resolveMode(tool, inputImageCount, variantId);
  const controls = getBarControls(mode);
  const primary = controls.filter((c) => c.group === 'primary');
  const settings = controls.filter((c) => c.group === 'settings');

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <VariantControl
        variants={variants}
        value={variantId}
        onChange={onVariantChange}
      />
      {primary.map((c) => (
        <ControlOption
          key={c.id}
          control={c}
          value={values[c.id] ?? c.default}
          onChange={(v) => onValueChange(c.id, v)}
        />
      ))}
      {settings.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="secondary" size="sm">
              <Settings2 className="size-4" />
              Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="space-y-3">
            {settings.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </p>
                <ControlOption
                  control={c}
                  value={values[c.id] ?? c.default}
                  onChange={(v) => onValueChange(c.id, v)}
                />
              </div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
