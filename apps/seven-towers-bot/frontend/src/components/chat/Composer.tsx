"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Mic, Square, X } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useToast } from "@/components/ui/Toast";
import { VoiceWaveform } from "@/components/chat/VoiceWaveform";
import { MAX_MESSAGE_CHARS } from "@/lib/config";
import { isOverMessageLimit, shouldShowCharCounter } from "@/lib/format";
import { clampTranscript, joinTranscript } from "@/lib/speech-to-text";
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
/** Matches size-9 controls — keeps dictation/writing height stable. */
const FIELD_ROW_PX = 36;

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
  const [voiceSnapshot, setVoiceSnapshot] = useState("");
  const wasListeningRef = useRef(false);
  const { toast } = useToast();

  const onVoiceError = useCallback(
    (message: string): void => {
      toast(message, "danger");
    },
    [toast],
  );

  const speech = useSpeechToText({
    onError: onVoiceError,
  });

  const listening = speech.status === "listening";

  // Commit transcript into the field only when leaving dictation (not cancel).
  useEffect(() => {
    if (wasListeningRef.current && !listening) {
      const committed = clampTranscript(
        joinTranscript(voiceSnapshot, speech.parts.finals, ""),
        MAX_MESSAGE_CHARS,
      );
      setText(committed);
    }
    wasListeningRef.current = listening;
  }, [listening, speech.parts.finals, voiceSnapshot]);

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
    if (listening) return;
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    const contentHeight = el.scrollHeight;
    const isCapped = contentHeight > MAX_HEIGHT_PX;
    el.style.height = `${Math.min(contentHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = isCapped ? "scroll" : "hidden";
    setCapped(isCapped);
    updateFades();
  }, [text, listening, updateFades]);

  const voiceDraft = joinTranscript(
    voiceSnapshot,
    speech.parts.finals,
    speech.parts.interim,
  );
  const draftForSend = listening ? voiceDraft : text;
  const trimmed = draftForSend.trim();
  const overLimit = isOverMessageLimit(draftForSend.length, MAX_MESSAGE_CHARS);
  const showCounter =
    !listening && shouldShowCharCounter(text.length, MAX_MESSAGE_CHARS);
  const canSend = Boolean(trimmed) && !overLimit && !disabled && !streaming;
  const multiLine =
    !listening && (text.includes("\n") || text.length > 48);
  const canUseMic = speech.supported && !disabled && !streaming;

  const stopSpeech = speech.stop;

  const submit = useCallback(() => {
    if (!canSend) return;
    const toSend = trimmed;
    if (listening) {
      // Skip the post-listen commit effect — we're sending immediately.
      wasListeningRef.current = false;
      setVoiceSnapshot("");
      stopSpeech();
    }
    onSend(toSend);
    setText("");
    setVoiceSnapshot("");
  }, [canSend, listening, onSend, stopSpeech, trimmed]);

  const startVoice = (): void => {
    if (!canUseMic) return;
    setVoiceSnapshot(text);
    speech.start();
  };

  const stopVoice = (): void => {
    speech.stop();
  };

  const cancelVoice = (): void => {
    const keep = voiceSnapshot;
    wasListeningRef.current = false;
    speech.cancel();
    setText(keep);
  };

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
          ? "pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2"
          : "px-4 py-0",
      )}
    >
      <div
        className={cn(
          "composer-shell pointer-events-auto flex items-center gap-2 px-3 py-1.5",
          "transition-[border-radius] duration-200 ease-out",
          multiLine ? "rounded-[22px]" : "rounded-[30px]",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden transition-[width,opacity] duration-200 ease-out",
            listening ? "w-9 opacity-100" : "w-0 opacity-0",
          )}
        >
          <button
            type="button"
            aria-label="Cancel voice input"
            tabIndex={listening ? 0 : -1}
            onClick={cancelVoice}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden transition-[height] duration-200 ease-out",
            fadeTop && fadeBottom && !listening && "composer-fade",
            fadeTop && !fadeBottom && !listening && "composer-fade-top",
            !fadeTop && fadeBottom && !listening && "composer-fade-bottom",
          )}
          style={{
            height: listening ? FIELD_ROW_PX : undefined,
            minHeight: FIELD_ROW_PX,
          }}
        >
          {listening ? (
            <div
              className="flex h-9 items-center"
              aria-live="polite"
              aria-label="Listening"
            >
              <VoiceWaveform stream={speech.mediaStream} />
            </div>
          ) : (
            <textarea
              ref={areaRef}
              dir="auto"
              rows={1}
              value={text}
              disabled={disabled}
              placeholder="Message Seven Towers Sales Trainer…"
              style={{
                ...FIELD_STYLE,
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
          )}
        </div>

        <div className="flex h-9 shrink-0 items-center gap-1.5">
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

          {speech.supported ? (
            listening ? (
              <button
                type="button"
                aria-label="Stop listening"
                onClick={stopVoice}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-text hover:bg-surface-2"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Start voice input"
                title={
                  canUseMic
                    ? "Voice input"
                    : "Voice input unavailable while generating"
                }
                disabled={!canUseMic}
                onClick={startVoice}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full text-muted",
                  "hover:bg-surface-2 hover:text-text disabled:opacity-40",
                )}
              >
                <Mic className="size-4" strokeWidth={1.75} />
              </button>
            )
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
