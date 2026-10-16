import type { Transition } from "motion/react";

/** One shared spring for drawers, modals, and list enters. */
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
};

/** Fixed chrome control size — open/close toggles must stay the same size. */
export const CHROME_ICON =
  "size-10 shrink-0 rounded-full glass text-text hover:bg-surface-2";

export const fadeRise = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: spring,
};

export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
};
