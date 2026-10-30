/**
 * HTTP smoke against a running Studio backend (:4001 by default).
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD, optional SMOKE_BASE_URL.
 */
import { PRODUCT_NAME } from '@studio/shared';

const base = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4001').replace(
  /\/$/,
  '',
);
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;

if (!email || !password) {
  process.stderr.write('SMOKE_EMAIL and SMOKE_PASSWORD are required\n');
  process.exit(1);
}

type Jar = Map<string, string>;

function storeCookies(jar: Jar, res: Response): void {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(';')[0];
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

function cookieHeader(jar: Jar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(
  jar: Jar,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown; res: Response }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(jar),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  storeCookies(jar, res);
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }
  return { status: res.status, json, res };
}

async function main(): Promise<void> {
  const jar: Jar = new Map();
  const started = Date.now();

  const login = await api(jar, 'POST', '/api/auth/login', { email, password });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.json)}`);
  }

  const caps = await api(jar, 'GET', '/api/capabilities');
  if (caps.status !== 200) {
    throw new Error(`capabilities failed: ${caps.status}`);
  }
  const capsBody = caps.json as { product?: string; engine?: { state: string } };
  if (capsBody.product !== PRODUCT_NAME) {
    throw new Error(`unexpected product ${capsBody.product}`);
  }

  const thread = await api(jar, 'POST', '/api/threads', {});
  if (thread.status !== 201) {
    throw new Error(`create thread failed: ${thread.status}`);
  }
  const threadId = (thread.json as { thread: { id: string } }).thread.id;

  const eventsDone = new Promise<{ jobId: string; assetIds: string[] }>(
    (resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timed out waiting for job.done')),
        180_000,
      );
      void (async () => {
        const res = await fetch(`${base}/api/events`, {
          headers: { Cookie: cookieHeader(jar), Accept: 'text/event-stream' },
        });
        if (!res.ok || !res.body) {
          clearTimeout(timer);
          reject(new Error(`SSE failed: ${res.status}`));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';
          for (const block of parts) {
            const dataLine = block
              .split('\n')
              .find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const event = JSON.parse(dataLine.slice(6)) as {
              type: string;
              jobId?: string;
              assetIds?: string[];
            };
            process.stdout.write(`sse ${JSON.stringify(event)}\n`);
            if (event.type === 'job.done' && event.jobId && event.assetIds) {
              clearTimeout(timer);
              await reader.cancel();
              resolve({ jobId: event.jobId, assetIds: event.assetIds });
              return;
            }
            if (event.type === 'job.failed') {
              clearTimeout(timer);
              await reader.cancel();
              reject(new Error(`job failed: ${JSON.stringify(event)}`));
              return;
            }
          }
        }
        clearTimeout(timer);
        reject(new Error('SSE closed before job.done'));
      })().catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    },
  );

  // Brief delay so the SSE subscribe lands before enqueue.
  await new Promise((r) => setTimeout(r, 200));

  const gen = await api(jar, 'POST', `/api/threads/${threadId}/generations`, {
    tool: 'image',
    prompt: 'api smoke: a simple blue square',
    values: { aspectRatio: '1:1' },
    variant: 'fast',
  });
  if (gen.status !== 202) {
    throw new Error(`generation failed: ${gen.status} ${JSON.stringify(gen.json)}`);
  }
  const jobId = (gen.json as { job: { id: string } }).job.id;

  const done = await eventsDone;
  if (done.jobId !== jobId) {
    process.stdout.write(
      `note: done job ${done.jobId} differs from submitted ${jobId}\n`,
    );
  }
  const assetId = done.assetIds[0];
  if (!assetId) throw new Error('job.done had no assetIds');

  const file = await fetch(`${base}/api/files/${assetId}?download=1`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  if (!file.ok) throw new Error(`download failed: ${file.status}`);
  const bytes = Buffer.from(await file.arrayBuffer());

  const ms = Date.now() - started;
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        product: capsBody.product,
        engine: capsBody.engine?.state,
        threadId,
        jobId,
        assetId,
        bytes: bytes.byteLength,
        ms,
      },
      null,
      2,
    ) + '\n',
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
