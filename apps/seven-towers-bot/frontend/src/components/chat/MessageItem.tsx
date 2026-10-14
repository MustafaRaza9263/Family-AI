"use client";

import { Copy } from "lucide-react";
import type { ReactNode } from "react";
import { copyText } from "@/lib/errors-ui";
import type { Attachment, Message } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
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

  return (
    <article className="w-full text-sm">
      <div className="mb-1 flex items-center justify-end gap-1">
        <IconButton
          label="Copy reply"
          onClick={() => void copyText(message.content)}
          disabled={!message.content}
        >
          <Copy className="size-4" />
        </IconButton>
      </div>
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
            <span className="ml-0.5 inline-block w-0.5 animate-pulse bg-accent" aria-hidden />
          ) : null}
        </>
      )}
      {attachmentSlot}
    </article>
  );
}
