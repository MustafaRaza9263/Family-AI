"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/lib/motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/cn";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
};

const DESKTOP_MQ = "(min-width: 1024px)";

export function AppShell({
  sidebar,
  header,
  children,
  sidebarOpen,
  onSidebarOpenChange,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useLocalStorage("sidebar-collapsed", false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = (): void => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showPersistent = isDesktop && !collapsed;
  const showDrawer = !isDesktop && sidebarOpen;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {showPersistent ? (
        <div className="hidden w-[280px] shrink-0 lg:block">{sidebar}</div>
      ) : null}

      <AnimatePresence>
        {showDrawer ? (
          <>
            <motion.button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-40 bg-bg/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onSidebarOpenChange(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={spring}
            >
              {sidebar}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="glass sticky top-0 z-30 border-b border-border">
          {header}
          {isDesktop ? (
            <button
              type="button"
              className={cn(
                "absolute right-3 top-3 hidden text-xs text-muted lg:inline",
              )}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? "Show sidebar" : "Hide sidebar"}
            </button>
          ) : null}
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
