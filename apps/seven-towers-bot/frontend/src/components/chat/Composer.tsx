"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Square } from "lucide-react";
import { MAX_MESSAGE_CHARS } from "@/lib/config";
import { isOverMessageLimit, shouldShowCharCounter } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

type ComposerProps = {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
};

const LINE_HEIGHT_PX = 24;
const MAX_LINES = 6;

export function Composer({ onSend, onStop, streaming, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [composing, setComposing] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const areaRef = useRef<HTMLTextAreaElement>(null);

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
    el.style.height = "auto";
    const max = LINE_HEIGHT_PX * MAX_LINES;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [text]);

  const trimmed = text.trim();
  const overLimit = isOverMessageLimit(text.length, MAX_MESSAGE_CHARS);
  const showCounter = shouldShowCharCounter(text.length, MAX_MESSAGE_CHARS);
  const canSend = Boolean(trimmed) && !overLimit && !disabled && !streaming;

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
    <div className="glass border-t border-border px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow">
        <textarea
          ref={areaRef}
          dir="auto"
          rows={1}
          value={text}
          disabled={disabled}
          placeholder="Message Seven Towers Assistant…"
          className="max-h-36 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        <div className="flex flex-col items-end gap-1">
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
            <IconButton label="Stop generating" onClick={onStop}>
              <Square className="size-4 fill-current" />
            </IconButton>
          ) : (
            <Button
              variant="primary"
              className="size-9 rounded-full p-0"
              disabled={!canSend}
              onClick={submit}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
