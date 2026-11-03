'use client';

import { motion } from 'motion/react';
import { toolUi, type ToolId } from '@/features/create/tool-ui';
import { cn } from '@/lib/cn';

export function ToolSwitch({
  value,
  onChange,
  showVideo,
}: {
  value: ToolId;
  onChange: (id: ToolId) => void;
  showVideo: boolean;
}) {
  const tools: ToolId[] = showVideo ? ['image', 'video'] : ['image'];

  return (
    <div role="group" aria-label="Tool" className="relative inline-flex gap-0.5">
      {tools.map((id) => {
        const ui = toolUi(id);
        const Icon = ui.icon;
        const pressed = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={ui.title}
            aria-pressed={pressed}
            data-tip={ui.title}
            className={cn(
              'relative grid size-8 place-items-center rounded-lg transition-colors duration-200',
              pressed
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(id)}
          >
            {pressed ? (
              <motion.span
                layoutId="tool-switch-pill"
                className="absolute inset-0 rounded-lg bg-surface-muted"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 32,
                  mass: 0.7,
                }}
              />
            ) : null}
            <motion.span
              className="relative"
              animate={{
                scale: pressed ? 1 : 0.92,
                opacity: pressed ? 1 : 0.7,
              }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            >
              <Icon className="size-[16px]" strokeWidth={pressed ? 2 : 1.7} />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
