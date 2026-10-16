"use client";

import { Copy } from "lucide-react";
import type { ReactNode } from "react";
import { copyText } from "@/lib/errors-ui";
import type { Attachment, Message } from "@/lib/types";
import { Attachments } from "@/components/rich/Attachments";
import { Markdown } from "./Markdown";
import { MessageError } from "./MessageError";
import { TypingIndicator } from "./TypingIndicator";

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

  const showCaret =
    message.streaming && !message.content && !message.errorCode;
  const showCopy =
    Boolean(message.content) && !message.streaming && !message.errorCode;

  return (
    <article className="w-full text-sm">
      {message.errorCode ? (
        <MessageError
          message={message.errorMessage ?? "Something went wrong."}
          onRetry={onRetry}
        />
      ) : (
        <>
          {message.content ? (
            <div dir="auto">
              <Markdown content={message.content} />
            </div>
          ) : null}
          {showCaret ? <TypingIndicator /> : null}
          {message.streaming && message.content ? (
            <span
              className="ml-0.5 inline-block w-0.5 animate-pulse bg-accent"
              aria-hidden
            />
          ) : null}
        </>
      )}
      {attachmentSlot}
      {showCopy ? (
        <div className="mt-2 flex items-center">
          <button
            type="button"
            aria-label="Copy reply"
            title="Copy"
            onClick={() => void copyText(message.content)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            <Copy className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
