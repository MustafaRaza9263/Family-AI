"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

/** Matches Tailwind `sm` — below this, the modal is a bottom sheet. */
const SHEET_MQ = "(max-width: 639px)";

function sheetMotion(isSheet: boolean) {
  if (isSheet) {
    return {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
    };
  }
  return {
    initial: { opacity: 0, x: "-50%", y: "calc(-50% + 16px)", scale: 0.98 },
    animate: { opacity: 1, x: "-50%", y: "-50%", scale: 1 },
    exit: { opacity: 0, x: "-50%", y: "calc(-50% + 16px)", scale: 0.98 },
  };
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const [isSheet, setIsSheet] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(SHEET_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(SHEET_MQ);
    const update = (): void => setIsSheet(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const motionProps = sheetMotion(isSheet);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="modal-backdrop"
            type="button"
            aria-label="Dismiss"
            className="fixed inset-0 z-50 bg-bg/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "fixed z-50 w-full border border-border bg-surface p-0 text-text",
              // Mobile: bottom sheet
              "bottom-0 left-0 right-0 rounded-t-[var(--radius-lg)] rounded-b-none border-x-0 border-b-0",
              // Desktop: centered modal
              "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg sm:border",
              className,
            )}
            style={{ boxShadow: "var(--shadow-lg)" }}
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            transition={spring}
          >
            <div
              className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
              aria-hidden
            />
            <div className="flex flex-col gap-4 p-5 pt-3 sm:pt-5">
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
              <div>{children}</div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
