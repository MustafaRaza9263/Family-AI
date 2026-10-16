"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { fadeRise } from "@/lib/motion";
import { Button } from "@/components/ui/Button";

type ScrollToBottomProps = {
  visible: boolean;
  onClick: () => void;
};

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
      {...fadeRise}
    >
      <Button
        variant="secondary"
        className="pointer-events-auto rounded-full glass px-4 py-2 shadow"
        onClick={onClick}
      >
        <ChevronDown className="size-4" aria-hidden />
        New messages
      </Button>
    </motion.div>
  );
}
