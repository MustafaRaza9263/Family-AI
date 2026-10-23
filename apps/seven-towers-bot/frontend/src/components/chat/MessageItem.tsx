"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { stripAttachmentMarkers } from "@/lib/attachment-markers";
import { copyText } from "@/lib/errors-ui";
import type { Attachment, Message } from "@/lib/types";
import { Attachments } from "@/components/rich/Attachments";
import { Markdown } from "./Markdown";
import { MessageError } from "./MessageError";
import { TypingIndicator } from "./TypingIndicator";

const COPIED_MS = 1500;

type MessageItemProps = {
  message: Message;
  onRetry?: () => void;
  renderAttachments?: (items: Attachment[]) => ReactNode;
};

export function MessageItem({
  message,
  onRetry,
  renderAttachments,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  const attachmentSlot =
    message.attachments.length > 0
      ? (renderAttachments?.(message.attachments) ?? (
          <Attachments items={message.attachments} />
        ))
      : null;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-accent/15 px-4 py-2 text-sm">
          <p dir="auto" className="whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Hide markers the model sometimes echoes (live stream + stored history).
  const displayContent = stripAttachmentMarkers(message.content);
  const showCaret =
    message.streaming && !displayContent && !message.errorCode;
  const showCopy =
    Boolean(displayContent) && !message.streaming && !message.errorCode;

  const onCopy = (): void => {
    void copyText(displayContent).then((ok) => {
      if (!ok) return;
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
      setCopied(true);
      copiedTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimer.current = null;
      }, COPIED_MS);
    });
  };

  const tooltip = copied ? "Copied" : "Copy response";

  return (
    <article className="w-full text-sm">
      {message.errorCode ? (
        <MessageError
          message={message.errorMessage ?? "Something went wrong."}
          onRetry={onRetry}
        />
      ) : (
        <>
          {displayContent ? (
            <div dir="auto">
              <Markdown content={displayContent} />
            </div>
          ) : null}
          {showCaret ? <TypingIndicator /> : null}
          {message.streaming && displayContent ? (
            <span
              className="ml-0.5 inline-block w-0.5 animate-pulse bg-accent"
              aria-hidden
            />
          ) : null}
        </>
      )}
      {attachmentSlot}
      {showCopy ? (
        <div className="group relative mt-2 inline-flex items-center">
          <button
            type="button"
            aria-label={tooltip}
            onClick={onCopy}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={1.75} />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.75} />
            )}
          </button>
          <span
            role="tooltip"
            className={
              "pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 " +
              "whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text " +
              "opacity-0 transition-opacity group-hover:opacity-100 " +
              (copied ? "opacity-100" : "")
            }
          >
            {tooltip}
          </span>
        </div>
      ) : null}
    </article>
  );
}
