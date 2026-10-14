"use client";

import type { Message } from "@/lib/types";
import { MessageItem } from "@/components/chat/MessageItem";
import { Attachments } from "@/components/rich/Attachments";

type TranscriptProps = {
  messages: Message[];
};

export function Transcript({ messages }: TranscriptProps) {
  return (
    <div className="flex flex-col gap-4">
      <p
        className="rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
        role="status"
      >
        Admin view: this access is logged
      </p>
      <div className="flex flex-col gap-6">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">This conversation has no messages.</p>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              renderAttachments={(items) => <Attachments items={items} />}
            />
          ))
        )}
      </div>
    </div>
  );
}
