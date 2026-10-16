"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Square } from "lucide-react";
import { MAX_MESSAGE_CHARS } from "@/lib/config";
import { isOverMessageLimit, shouldShowCharCounter } from "@/lib/format";
import { cn } from "@/lib/cn";

type ComposerProps = {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placement?: "center" | "bottom";
};

const LINE_HEIGHT_PX = 24;
const MAX_LINES = 6;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES;

/** Inline so Tailwind preflight (resize: vertical) cannot win. */
const FIELD_STYLE: CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  resize: "none",
  border: "none",
  outline: "none",
  boxShadow: "none",
  background: "transparent",
  overflowX: "hidden",
  // Hide scrollbar in Firefox / legacy Edge; WebKit clipped by wrapper below.
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

export function Composer({
  onSend,
  onStop,
  streaming,
  disabled,
  placement = "bottom",
}: ComposerProps) {
  const [text, setText] = useState("");
  const [composing, setComposing] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const [capped, setCapped] = useState(false);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const updateFades = useCallback((): void => {
    const el = areaRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    if (!canScroll) {
      setFadeTop(false);
      setFadeBottom(false);
      return;
    }
    setFadeTop(el.scrollTop > 2);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = (): void => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    // Measure unconstrained height first, then cap.
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    const contentHeight = el.scrollHeight;
    const isCapped = contentHeight > MAX_HEIGHT_PX;
    el.style.height = `${Math.min(contentHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = isCapped ? "scroll" : "hidden";
    setCapped(isCapped);
    updateFades();
  }, [text, updateFades]);

  const trimmed = text.trim();
  const overLimit = isOverMessageLimit(text.length, MAX_MESSAGE_CHARS);
  const showCounter = shouldShowCharCounter(text.length, MAX_MESSAGE_CHARS);
  const canSend = Boolean(trimmed) && !overLimit && !disabled && !streaming;
  const multiLine = text.includes("\n") || text.length > 48;

  const submit = useCallback(() => {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  }, [canSend, onSend, trimmed]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (composing || event.key !== "Enter") return;
    if (!finePointer || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl",
        placement === "bottom"
          ? // Overlay the transcript so messages scroll under the field.
            "pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2"
          : "px-4 py-0",
      )}
    >
      <div
        className={cn(
          "composer-shell pointer-events-auto flex items-center gap-2 px-3 py-1.5",
          multiLine ? "rounded-[22px]" : "rounded-[30px]",
        )}
      >
        {/* overflow:hidden clips WebKit scrollbar + resize grip outside the pill */}
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden",
            fadeTop && fadeBottom && "composer-fade",
            fadeTop && !fadeBottom && "composer-fade-top",
            !fadeTop && fadeBottom && "composer-fade-bottom",
          )}
        >
          <textarea
            ref={areaRef}
            dir="auto"
            rows={1}
            value={text}
            disabled={disabled}
            placeholder="Message Seven Towers Assistant…"
            style={{
              ...FIELD_STYLE,
              // Push native scrollbar into the clipped gutter.
              width: capped ? "calc(100% + 48px)" : "100%",
              paddingRight: capped ? 48 : 0,
              maxHeight: MAX_HEIGHT_PX,
              overflowY: capped ? "scroll" : "hidden",
            }}
            className="composer-input min-h-6 py-2 text-sm leading-6 text-text placeholder:text-muted"
            onChange={(e) => setText(e.target.value)}
            onScroll={updateFades}
            onKeyDown={onKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
          />
        </div>
        <div className="flex h-9 shrink-0 items-center gap-2">
          {showCounter ? (
            <span
              className={cn(
                "text-xs tabular-nums text-muted",
                overLimit && "text-danger",
              )}
            >
              {text.length}/{MAX_MESSAGE_CHARS}
            </span>
          ) : null}
          {streaming ? (
            <button
              type="button"
              aria-label="Stop generating"
              onClick={onStop}
              className="inline-flex size-9 items-center justify-center rounded-full bg-surface text-text hover:bg-border/50"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send message"
              disabled={!canSend}
              onClick={submit}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full",
                "bg-accent text-accent-text disabled:opacity-40",
              )}
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
