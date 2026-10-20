import type { Transition } from "motion/react";

/** One shared spring for drawers, modals, and list enters. */
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
};

/** Floating iOS control — round glass icon button. */
export const CHROME_ICON =
  "size-12 shrink-0 rounded-full glass text-text hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]";

/** Alias kept for sidebar / standalone call sites. */
export const CHROME_ICON_STANDALONE = CHROME_ICON;

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
