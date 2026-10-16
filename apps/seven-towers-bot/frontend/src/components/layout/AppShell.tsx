"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, PanelLeft, Plus } from "lucide-react";
import { CHROME_ICON, spring } from "@/lib/motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "./ThemeToggle";

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  onNewChat: () => void;
};

const DESKTOP_MQ = "(min-width: 1024px)";
const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 280;

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(width)));
}

export function AppShell({
  sidebar,
  children,
  sidebarOpen,
  onSidebarOpenChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  onNewChat,
}: AppShellProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(
    "sidebar-width",
    SIDEBAR_DEFAULT,
  );
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = (): void => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setResizing(true);
      dragRef.current = { startX: event.clientX, startWidth: sidebarWidth };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [sidebarWidth],
  );

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const delta = event.clientX - dragRef.current.startX;
      setSidebarWidth(clampSidebarWidth(dragRef.current.startWidth + delta));
    },
    [setSidebarWidth],
  );

  const onResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      setResizing(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const showDrawer = !isDesktop && sidebarOpen;
  const desktopWidth = sidebarCollapsed ? 0 : sidebarWidth;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Desktop: width-animated panel (keeps mount so open/close is smooth) */}
      <motion.div
        className="relative hidden shrink-0 overflow-hidden lg:block"
        initial={false}
        animate={{ width: desktopWidth }}
        transition={resizing ? { duration: 0 } : spring}
      >
        <div className="h-full" style={{ width: sidebarWidth }}>
          {sidebar}
        </div>
        {!sidebarCollapsed ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize touch-none hover:bg-accent/25"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
        ) : null}
      </motion.div>

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
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              style={{ width: Math.min(sidebarWidth, 320) }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={spring}
            >
              {sidebar}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <div className="pointer-events-auto flex items-center gap-2">
            <IconButton
              label="Open conversations"
              className={CHROME_ICON}
              onClick={() => onSidebarOpenChange(true)}
            >
              <Menu className="size-5" />
            </IconButton>
            <IconButton
              label="New chat"
              className={CHROME_ICON}
              onClick={onNewChat}
            >
              <Plus className="size-5" />
            </IconButton>
          </div>
          <div className="pointer-events-auto rounded-full glass p-1">
            <ThemeToggle compact />
          </div>
        </div>

        <AnimatePresence>
          {isDesktop && sidebarCollapsed ? (
            <motion.div
              className="absolute left-3 top-3 z-30 hidden lg:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IconButton
                label="Show sidebar"
                className={CHROME_ICON}
                onClick={() => onSidebarCollapsedChange(false)}
              >
                <PanelLeft className="size-5" />
              </IconButton>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
