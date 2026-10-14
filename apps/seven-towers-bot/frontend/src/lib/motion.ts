import type { Transition } from "motion/react";

/** One shared spring for drawers, modals, and list enters. */
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
};

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
