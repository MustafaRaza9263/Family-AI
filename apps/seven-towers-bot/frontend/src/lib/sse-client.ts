import { ApiError } from "./api";
import type { ApiErrorBody, SseEvent } from "./types";
import { PROJECT_ID } from "./config";

export type ParsedSseFrame = { event: string; data: string };

/**
 * Parse buffered SSE text into complete frames. Handles frames split across
 * chunks, CRLF, multi-line data, and comment heartbeats (": ...").
 */
export function parseSseChunks(
  buffer: string,
): { frames: ParsedSseFrame[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const frames: ParsedSseFrame[] = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join("\n") });
    }
  }
  return { frames, rest };
}

function toSseEvent(frame: ParsedSseFrame): SseEvent | null {
  try {
    const data: unknown = JSON.parse(frame.data);
    switch (frame.event) {
      case "meta":
      case "token":
      case "attachment":
      case "done":
      case "error":
        return { event: frame.event, data } as SseEvent;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function throwIfNotSse(res: Response): Promise<void> {
  const ct = res.headers.get("content-type") ?? "";
  if (res.ok && ct.includes("text/event-stream")) return;
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // fall through
  }
  throw new ApiError(
    res.status,
    body?.error?.code ?? "INTERNAL",
    body?.error?.message ?? "Stream failed",
    body?.error?.details,
  );
}

/** POST /api/chat and yield typed SSE events until the stream ends. */
export async function* streamChat(options: {
  conversationId?: string;
  projectId?: string;
  message: string;
  signal?: AbortSignal;
}): AsyncGenerator<SseEvent, void, undefined> {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId: options.conversationId,
      projectId: options.projectId ?? PROJECT_ID,
      message: options.message,
    }),
  });

  await throwIfNotSse(res);
  if (!res.body) throw new ApiError(500, "INTERNAL", "Empty stream body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunks(buffer);
    buffer = parsed.rest;
    for (const frame of parsed.frames) {
      const event = toSseEvent(frame);
      if (event) yield event;
    }
  }
}
