import type { Message } from "@/lib/types";
import { tempId } from "@/lib/errors-ui";

export function createOptimisticMessages(text: string): {
  user: Message;
  assistant: Message;
} {
  const now = new Date().toISOString();
  return {
    user: {
      id: tempId("user"),
      role: "user",
      content: text,
      attachments: [],
      createdAt: now,
    },
    assistant: {
      id: tempId("asst"),
      role: "assistant",
      content: "",
      attachments: [],
      createdAt: now,
      streaming: true,
    },
  };
}

export function createRafTokenFlusher(onFlush: (delta: string) => void): {
  push: (text: string) => void;
  flushSync: () => void;
  cancel: () => void;
} {
  let buffer = "";
  let raf = 0;

  const flush = (): void => {
    if (!buffer) return;
    const chunk = buffer;
    buffer = "";
    onFlush(chunk);
  };

  return {
    push(text: string) {
      buffer += text;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        flush();
      });
    },
    flushSync() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      flush();
    },
    cancel() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      buffer = "";
    },
  };
}
