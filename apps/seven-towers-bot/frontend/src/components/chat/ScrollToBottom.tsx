"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { CHROME_ICON, fadeRise } from "@/lib/motion";
import { IconButton } from "@/components/ui/IconButton";

type ScrollToBottomProps = {
  visible: boolean;
  onClick: () => void;
};

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-[6.5rem] z-[25] flex justify-center"
      {...fadeRise}
    >
      <IconButton
        label="New messages"
        className={`pointer-events-auto ${CHROME_ICON}`}
        onClick={onClick}
      >
        <ChevronDown className="size-5" />
      </IconButton>
    </motion.div>
  );
}
