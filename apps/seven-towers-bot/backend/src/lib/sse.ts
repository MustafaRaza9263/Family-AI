import type { Response } from 'express';
import { SSE_HEARTBEAT_MS } from '../config/limits';

export type SseWriter = {
  send: (event: string, data: unknown) => void;
  close: () => void;
  get closed(): boolean;
};

/** Open an SSE response: headers, framing, and heartbeat comments. */
export function openSse(res: Response): SseWriter {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  const heartbeat = setInterval(() => {
    if (closed) {
      return;
    }
    res.write(': ping\n\n');
  }, SSE_HEARTBEAT_MS);

  const stop = (): void => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(heartbeat);
  };

  res.on('close', stop);

  return {
    get closed() {
      return closed;
    },
    send(event: string, data: unknown): void {
      if (closed) {
        return;
      }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close(): void {
      stop();
      if (!res.writableEnded) {
        res.end();
      }
    },
  };
}
