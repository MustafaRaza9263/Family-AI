import { randomUUID } from 'node:crypto';
import type { Logger } from '../lib/logger.js';
import type {
  ComfyEventHandler,
  ComfyEvents,
  ComfyWsEvent,
} from './types.js';
import { parseWsFrame } from './ws-messages.js';

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 500;

export type ComfySocket = ComfyEvents & {
  readonly clientId: string;
  close(): void;
};

export type CreateComfySocketOptions = {
  baseUrl: string;
  logger: Logger;
  clientId?: string;
  onRawText?: (text: string) => void;
  WebSocketImpl?: typeof WebSocket;
};

function toWsUrl(baseUrl: string, clientId: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = `clientId=${encodeURIComponent(clientId)}`;
  return url.toString();
}

export function createComfySocket(opts: CreateComfySocketOptions): ComfySocket {
  const clientId = opts.clientId ?? randomUUID();
  const WS = opts.WebSocketImpl ?? WebSocket;
  const { logger, onRawText } = opts;
  const subscribers = new Map<string, Set<ComfyEventHandler>>();

  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connected = false;

  const dispatch = (event: ComfyWsEvent): void => {
    if (!('promptId' in event)) return;
    const handlers = subscribers.get(event.promptId);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(event);
    }
  };

  const connect = (): void => {
    if (closed) return;
    const url = toWsUrl(opts.baseUrl, clientId);
    socket = new WS(url);

    socket.addEventListener('open', () => {
      connected = true;
      attempt = 0;
      logger.info({ clientId }, 'comfy websocket connected');
    });

    socket.addEventListener('message', (msg) => {
      if (typeof msg.data !== 'string') {
        // Binary frames are preview images; Studio never needs them.
        return;
      }
      onRawText?.(msg.data);
      const event = parseWsFrame(msg.data);
      if (!event) {
        logger.debug({ preview: msg.data.slice(0, 120) }, 'comfy ws drop');
        return;
      }
      dispatch(event);
    });

    socket.addEventListener('close', () => {
      connected = false;
      socket = null;
      if (closed) return;
      const delay = Math.min(
        MAX_BACKOFF_MS,
        BASE_BACKOFF_MS * 2 ** attempt,
      );
      attempt += 1;
      logger.warn({ delay, attempt }, 'comfy websocket reconnecting');
      reconnectTimer = setTimeout(connect, delay);
    });

    socket.addEventListener('error', () => {
      // `close` always follows; avoid double-logging noise here.
    });
  };

  connect();

  return {
    clientId,
    isConnected(): boolean {
      return connected;
    },
    subscribe(promptId, handler) {
      let set = subscribers.get(promptId);
      if (!set) {
        set = new Set();
        subscribers.set(promptId, set);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
        if (set.size === 0) subscribers.delete(promptId);
      };
    },
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = null;
      connected = false;
      subscribers.clear();
    },
  };
}
