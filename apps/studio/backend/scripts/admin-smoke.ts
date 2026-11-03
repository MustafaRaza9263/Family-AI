/**
 * Admin API smoke against a running Studio backend (:4001 by default).
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD (admin), optional SMOKE_BASE_URL.
 */
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
): Promise<{ status: number; json: unknown }> {
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
  return { status: res.status, json };
}

async function run(): Promise<void> {
  const jar: Jar = new Map();
  const login = await api(jar, 'POST', '/api/auth/login', { email, password });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.json)}`);
  }

  const jobs = await api(jar, 'GET', '/api/admin/jobs?limit=5');
  if (jobs.status !== 200) {
    throw new Error(`jobs failed: ${jobs.status}`);
  }
  const jobsBody = jobs.json as { items: { id: string }[] };
  process.stdout.write(`jobs: ${jobsBody.items.length} item(s)\n`);

  if (jobsBody.items[0]) {
    const detail = await api(
      jar,
      'GET',
      `/api/admin/jobs/${jobsBody.items[0].id}`,
    );
    if (detail.status !== 200) {
      throw new Error(`detail failed: ${detail.status}`);
    }
    process.stdout.write(`detail: ok (${jobsBody.items[0].id})\n`);
  }

  const stats = await api(jar, 'GET', '/api/admin/stats?range=24h');
  if (stats.status !== 200) {
    throw new Error(`stats failed: ${stats.status}`);
  }
  const statsBody = stats.json as {
    counts: { total: number };
    recipes: unknown[];
  };
  process.stdout.write(
    `stats: ${statsBody.counts.total} runs, ${statsBody.recipes.length} recipes\n`,
  );

  process.stdout.write('opening /api/admin/events for 5s…\n');
  const types = new Set<string>();
  let livePrinted = false;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);

  try {
    const res = await fetch(`${base}/api/admin/events`, {
      headers: { Cookie: cookieHeader(jar), Accept: 'text/event-stream' },
      signal: ac.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`admin events failed: ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split('\n\n');
      buf = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        let eventType = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim();
          if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        types.add(eventType);
        if (eventType === 'admin.live' && !livePrinted) {
          livePrinted = true;
          process.stdout.write(`admin.live: ${data}\n`);
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') throw err;
  } finally {
    clearTimeout(timer);
  }

  process.stdout.write(
    `event types seen: ${[...types].join(', ') || '(none)'}\n`,
  );
  process.stdout.write('admin:smoke ok\n');
}

run().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
