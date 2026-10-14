import type { Message, SseEvent } from "@/lib/types";
import { messageForErrorCode } from "@/lib/errors-ui";
import { createRafTokenFlusher } from "./chat-stream-buffer";

type SetMessages = (fn: (prev: Message[]) => Message[]) => void;

export async function consumeChatStream(options: {
  stream: AsyncGenerator<SseEvent, void, undefined>;
  userTempId: string;
  assistantTempId: string;
  setMessages: SetMessages;
  onConversationId?: (id: string) => void;
}): Promise<"ok" | "stream_error"> {
  const { userTempId, assistantTempId, setMessages } = options;
  const flusher = createRafTokenFlusher((delta) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantTempId ? { ...m, content: m.content + delta } : m,
      ),
    );
  });

  try {
    for await (const ev of options.stream) {
      switch (ev.event) {
        case "meta":
          options.onConversationId?.(ev.data.conversationId);
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === userTempId) return { ...m, id: ev.data.userMessageId };
              if (m.id === assistantTempId) return { ...m, model: ev.data.model };
              return m;
            }),
          );
          break;
        case "token":
          flusher.push(ev.data.text);
          break;
        case "attachment":
          flusher.flushSync();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? { ...m, attachments: [...m.attachments, ev.data] }
                : m,
            ),
          );
          break;
        case "done":
          flusher.flushSync();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? {
                    ...m,
                    id: ev.data.messageId,
                    streaming: false,
                    finishReason: ev.data.finishReason,
                  }
                : m,
            ),
          );
          return "ok";
        case "error":
          flusher.flushSync();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? {
                    ...m,
                    streaming: false,
                    errorCode: ev.data.code,
                    errorMessage: messageForErrorCode(
                      ev.data.code,
                      ev.data.message,
                    ),
                  }
                : m,
            ),
          );
          return "stream_error";
      }
    }
    flusher.flushSync();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantTempId ? { ...m, streaming: false } : m,
      ),
    );
    return "ok";
  } finally {
    flusher.cancel();
  }
}

export function applyStreamFailure(
  setMessages: SetMessages,
  assistantTempId: string,
  code: string,
  message: string,
): void {
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantTempId
        ? {
            ...m,
            streaming: false,
            errorCode: code,
            errorMessage: messageForErrorCode(code, message),
          }
        : m,
    ),
  );
}
