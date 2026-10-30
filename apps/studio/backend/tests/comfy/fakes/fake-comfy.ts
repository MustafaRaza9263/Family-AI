import type {
  ComfyEventHandler,
  ComfyEvents,
  ComfyHistoryEntry,
  ComfyHttp,
  ComfyImageRef,
  ComfyWsEvent,
} from '../../../src/comfy/types.js';
import type { ApiGraph } from '../../../src/comfy/recipes/graph-schema.js';

export type FakeHttp = ComfyHttp & {
  submitted: Array<{ graph: ApiGraph; clientId: string; promptId: string }>;
  interruptCalls: number;
  historyById: Map<string, ComfyHistoryEntry>;
  viewBytes: Buffer;
  pingError?: Error;
  submitError?: Error;
  order: string[];
};

export function createFakeHttp(
  overrides: Partial<{
    viewBytes: Buffer;
    pingError: Error;
    submitError: Error;
    order: string[];
  }> = {},
): FakeHttp {
  const order = overrides.order ?? [];
  const fake: FakeHttp = {
    submitted: [],
    interruptCalls: 0,
    historyById: new Map(),
    viewBytes: overrides.viewBytes ?? Buffer.from('png'),
    pingError: overrides.pingError,
    submitError: overrides.submitError,
    order,
    async ping() {
      order.push('ping');
      if (fake.pingError) throw fake.pingError;
    },
    async submit(graph, clientId, promptId) {
      order.push('submit');
      if (fake.submitError) throw fake.submitError;
      fake.submitted.push({ graph, clientId, promptId });
      return promptId;
    },
    async history(promptId) {
      return fake.historyById.get(promptId) ?? null;
    },
    async view(ref: ComfyImageRef) {
      void ref;
      return fake.viewBytes;
    },
    async interrupt() {
      fake.interruptCalls += 1;
      order.push('interrupt');
    },
    async queue() {
      return { running: [], pending: [] };
    },
    async clearPrompt(promptId: string) {
      void promptId;
      order.push('clearPrompt');
    },
  };
  return fake;
}

export type FakeEvents = ComfyEvents & {
  order: string[];
  emit(promptId: string, event: ComfyWsEvent): void;
  connected: boolean;
};

export function createFakeEvents(order: string[] = []): FakeEvents {
  const handlers = new Map<string, Set<ComfyEventHandler>>();
  const fake: FakeEvents = {
    order,
    connected: true,
    isConnected() {
      return fake.connected;
    },
    subscribe(promptId, handler) {
      order.push('subscribe');
      let set = handlers.get(promptId);
      if (!set) {
        set = new Set();
        handlers.set(promptId, set);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
        if (set.size === 0) handlers.delete(promptId);
      };
    },
    emit(promptId, event) {
      const set = handlers.get(promptId);
      if (!set) return;
      for (const handler of set) handler(event);
    },
  };
  return fake;
}
