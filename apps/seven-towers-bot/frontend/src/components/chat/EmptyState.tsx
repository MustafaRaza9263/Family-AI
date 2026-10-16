"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  Building2,
  CreditCard,
  LayoutTemplate,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { APP_NAME, SUGGESTED_PROMPTS } from "@/lib/config";
import { fadeRise } from "@/lib/motion";

type EmptyStateProps = {
  onPrompt: (text: string) => void;
  /** Composer sits between the greeting and the suggestion list (ChatGPT layout). */
  children?: ReactNode;
};

const PROMPT_ICONS: LucideIcon[] = [
  Building2,
  LayoutTemplate,
  CreditCard,
  MapPin,
];

export function EmptyState({ onPrompt, children }: EmptyStateProps) {
  return (
    <motion.div
      className="flex w-full max-w-3xl flex-col items-center gap-6 px-2"
      {...fadeRise}
    >
      <h1 className="px-4 text-center text-2xl font-semibold text-text sm:text-3xl">
        {APP_NAME}
      </h1>

      {children}

      <ul className="flex w-full max-w-3xl flex-col gap-0.5 px-4">
        {SUGGESTED_PROMPTS.map((prompt, index) => {
          const Icon = PROMPT_ICONS[index] ?? Building2;
          return (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => onPrompt(prompt)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-text hover:bg-surface-2"
              >
                <Icon
                  className="size-4 shrink-0 text-muted"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <span>{prompt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
