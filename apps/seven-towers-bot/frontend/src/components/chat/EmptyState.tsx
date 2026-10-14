"use client";

import { motion } from "motion/react";
import { APP_NAME, APP_TAGLINE, SUGGESTED_PROMPTS } from "@/lib/config";
import { fadeRise } from "@/lib/motion";
import { Button } from "@/components/ui/Button";

type EmptyStateProps = {
  onPrompt: (text: string) => void;
};

export function EmptyState({ onPrompt }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center"
      {...fadeRise}
    >
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold text-text">{APP_NAME}</h2>
        <p className="text-muted">{APP_TAGLINE}</p>
      </div>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="secondary"
            className="rounded-full text-left"
            onClick={() => onPrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
