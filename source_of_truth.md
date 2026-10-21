# company-ai — Source of Truth

> What exists, where it lives, and how we work. Update this file in the same commit as any architectural change.
> Last updated: 2026-10-21

## 1. What this is

On-premise AI assistants for the company, powered by one self-hosted LLM on an NVIDIA DGX Spark (Linux, ARM64, 128 GB memory shared by CPU and GPU).

| # | App | Purpose | Status |
|---|---|---|---|
| 1 | `seven-towers-bot` | Q&A on the Seven Towers project from ≤10 pages of company data, for the public (prospective buyers). Proof of concept | In development |
| 2 | `hub-bot` | Bosses-only assistant over the cloud CRM / EMS / HR / CMS via tool calling | Planned |
| 3 | `social-bot` | Replies to WhatsApp / social comments / app reviews, human approval for decisions | Planned |

Build order: 1 → 2 → 3.

**Principles:** model-agnostic and local/cloud-agnostic (switch by config only) · bot 1 works offline · simple over clever (<10K requests/day, no overkill) · evals before trust · every line understandable.

## 2. Architecture

```
Browser (LAN or public tunnel)      one address, relative URLs
   │
   ▼
App container (Express :4000)  ── serves built UI + /api
   │         └──► MongoDB          users, sessions, chats   [internal only]
   ▼
vLLM :8000  (OpenAI-compatible API + API key)               [internal only]
   ▼
Model weights in ~/.cache/huggingface                       [never in Git]
```

- Only app backends talk to vLLM. Browsers and users never do.
- All apps use the standard OpenAI-style interface. Switching to a cloud model = change `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`.
- No runtime calls to outside services (CDNs, fonts, analytics), so LAN/offline mode works.

## 3. Repository layout

```
company-ai/
├── SOURCE_OF_TRUTH.md
├── .cursor/rules/          AI coding rules (carry the practices in section 9)
├── apps/
│   └── seven-towers-bot/
│       ├── backend/        Express + TypeScript API
│       │   ├── src/        config · routes · controllers · services · guardrails · middleware · lib
│       │   ├── knowledge/<project>/   system.md · knowledge.md · images/ · source/ (gitignored)
│       │   ├── tests/
│       │   └── .env.example
│       └── frontend/       Next.js App Router (static export → out/)
│           └── src/        app · components/{ui,layout,auth,chat,rich,admin} · hooks · lib
├── infra/vllm/             docker-compose.yml · .env.example
├── evals/                  datasets/ · runners · results/
├── packages/               shared code (create only when 2+ apps need it)
└── docs/                   longer notes
```

## 4. Self-hosted LLM (`infra/vllm`)

- **Engine:** vLLM (`vllm/vllm-openai:v0.20.0`) in Docker Compose. `infra/vllm/docker-compose.yml` is the source of truth for all flags.
- **Model (provisional until evals confirm):** `Qwen/Qwen3.6-35B-A3B-FP8`, served as `qwen3.6`.
- **Endpoint:** `http://localhost:8000/v1`, bound to localhost, protected by `VLLM_API_KEY`.
- **Key settings:** 32K context · `--gpu-memory-utilization 0.60` · 8 concurrent requests · prefix caching on · reasoning and tool parsers set · thinking OFF by default per request.
- **Weights:** `~/.cache/huggingface`, mounted into the container. Never committed.
- **Ops** (from `infra/vllm`): `docker compose up -d` · `ps` · `logs -f` · `down`.
- **Memory:** one shared pool. Run one main model at a time.

## 5. Adding a new model

1. `hf download <org/model>` (venv: `~/venvs/hf`).
2. In the compose file change the model ID, `--served-model-name`, and parser flags (see the model card).
3. `docker compose up -d`, wait for "startup complete", check `/v1/models`.
4. Set `LLM_MODEL` in each app's `.env`.
5. Run evals on old vs new. Keep the new model only if accuracy is at least as good and latency is acceptable.
6. Record it in the Decisions log. Roll back by reverting the compose file.

## 6. Adding a new app

1. Create `apps/<name>/{backend,frontend}` with the same layers as `seven-towers-bot`.
2. Give it its own `.env`, port (next free: 4001…) and MongoDB database name.
3. Give it its own `knowledge/` pack and `evals/datasets/<name>`.
4. Reach the LLM only through the app's `llm.service.ts` using the standard env vars. Extract to `packages/llm-client` when a second app needs the same code.
5. Add a compose service and a row in the table in section 1.
6. Update this file.

A new *project* for an existing app (for example another property) is just a new folder in `knowledge/`, with no code change.

## 7. seven-towers-bot (existing app)

- **Goal:** proof of concept: accurate, fast answers on company data, running locally on the Spark, for the public.
- **Stack:** Express + TypeScript backend · Next.js static export served by Express (prod: one port, 4000; dev UI on 3000) · MongoDB · vLLM.
- **Accounts:** open registration. Anyone signs up with email, full name and phone number (all required; phone stored in E.164 format; contact details are unverified). Roles: `user` (everyone who signs up) and `admin`. Admin sees all users and their full chat sessions, and can disable or reset a user. The first admin is created with `npm run seed:admin`, never through signup. Every admin view of a user's chats is written to `audit_logs`. The signup screen tells users that chats are stored and visible to company staff.
- **Sessions and passwords:** server-side sessions in an httpOnly cookie, argon2id hashing, no email dependency (password resets are admin-assisted for now).
- **Chat:** `POST /api/chat` streams over SSE with events `meta`, `token`, `attachment`, `done`, `error`.
- **Knowledge:** two files per project (`system.md` + `knowledge.md`). The full knowledge base goes in the prompt (no RAG). Tables and images are parsed from `knowledge.md` (table markers + GFM tables; markdown image refs). `Last updated: YYYY-MM-DD` is required near the top. Reload validates first; on failure the previous in-memory pack is kept. `npm run knowledge:check` uses the same rules.
- **Rich results:** images live in `knowledge/<project>/images/` (WebP + thumbs from `source/` via `assets:build`). The model calls `show_images({ files, caption? })` with names as written in the knowledge base (no `images/` prefix or `.webp` suffix). Unknown names are dropped and the tool result suggests the closest valid ones. The backend emits `attachment` events; the UI renders a gallery. Tables, lists and headings are ordinary Markdown in the answer (GFM pipe tables); the UI renders them with `react-markdown` + `remark-gfm`. The model never writes image URLs. Only files in the parsed image map (and their thumbs) are served, and only to logged-in users. Knowledge-base `<!-- table: id -->` markers are still validated when loading packs; there is no `show_table` tool.
- **Guards:** message ≤1,500 chars · answer ≤1,024 tokens · last ~10 messages within the context budget · 20 requests/min and 200/day per user · 5 signups/hour per IP · hidden honeypot field on the signup form · max 6 answers in flight (else 503 "busy") · `trust proxy` for real visitor IPs · input injection flags · output fallback message.
- **MongoDB collections:** `users` (email, fullName, phone, passwordHash, role `user` or `admin`, status), `sessions`, `conversations`, `messages`, `audit_logs`.
- **UI:** premium iOS-style (Open WebUI-inspired layout), animated, responsive (phone, tablet, desktop), light/dark/system theme, safe-area aware, respects reduced motion. Tailwind v4 + Motion. System font stack with self-hosted Inter Variable fallback. No external assets; Express CSP enforces `default-src 'self'` (scripts/styles allow `'unsafe-inline'` for Next static hydration; `upgrade-insecure-requests` disabled for plain-HTTP LAN). Optional voice dictation in the composer via the browser Web Speech API (mic next to send; live transcript into the field; never auto-sends). Needs a secure context and often a network connection in Chromium; unsupported browsers hide the mic.

## 8. Deployment and serving

- **Development:** Cursor Remote-SSH to the Spark over Tailscale. Code lives at `~/projects/company-ai` on the Spark. A private Git remote is the backup.
- **Run:** Docker Compose on the Spark: `vllm`, `mongo`, and one container per app. `restart: unless-stopped`. Config via `.env` (never committed).
- **Access:** LAN at `http://<spark-lan-ip>:4000` (works offline). Public: Tailscale Funnel for the proof of concept, Cloudflare Tunnel with our own domain for production. The tunnel points only at the app port.
- **Same build, both ways:** relative URLs, cookie `Secure` set by protocol, no external assets.
- **To do:** nightly `mongodump` to another machine · UPS · wired Ethernet · fixed LAN IP.
- **Known risk:** the Spark is a single point of failure. Accepted at this scale.

## 9. Engineering practices

- **Layers:** routes (URL → controller) → controllers (HTTP only) → services (logic) → guardrails (judge input/output). One file, one job; aim for ≤150 lines.
- **Safety:** TypeScript `strict`, no `any`; Zod validation at every boundary (env, request bodies).
- **Readability:** explicit names; comments explain *why*; no clever abstractions. A junior should follow every line.
- **Config:** only through validated env; `.env.example` committed; secrets never in Git.
- **Errors and logs:** typed errors, one central handler, one JSON error shape; pino JSON logs with request ID; never log passwords.
- **Tests:** Vitest for guards, prompt builder and auth, with the LLM faked.
- **Style:** ESLint + Prettier; Conventional Commits (`feat:`, `fix:`, `chore:`); npm (not pnpm).
- **Versioned content:** system prompts and knowledge packs are files in Git, reviewed like code.
- **Evals first:** golden questions (including out-of-scope and attack questions) run on every model, prompt or data change. Benchmark TTFT, tokens/sec and p50/p95 latency before launch.
- **AI-assisted coding:** Cursor writes code from reviewed prompts, guided by `.cursor/rules/company-ai.mdc`. Every AI-written file is read and understood before commit.
- **Reuse:** move code to `packages/` only when a second app needs it.

## 10. Decisions log

| Decision | Why |
|---|---|
| vLLM in Docker as the only inference engine | Industry standard, OpenAI-compatible, handles concurrency |
| Qwen3.6-35B-A3B-FP8 (provisional) | MoE with 3B active parameters is fast; FP8 ≈ 35 GB; official weights. Evals decide |
| Document in the prompt, no RAG (≤10 pages) | Simpler; prefix caching keeps it fast |
| Thinking off by default | Latency; enable only where evals show a gain |
| Own UI, not Open WebUI | Brand control, rich results; Open WebUI's license requires its branding to stay for >50 users. Keep Open WebUI as an internal playground |
| Rich images via `show_images` over a server-side catalog; tables as GFM markdown in answers | No hallucinated image URLs; chat UIs already render markdown tables well |
| Two files per project; table markers and image names are parsed from the knowledge base | One editable markdown source; markers keep pack validation strict |
| Open registration (email, full name, phone required), roles `user` and `admin` | Captures buyer leads; admin sees all users and chats. Contact details are unverified |
| Server sessions + argon2id | Instant revocation, no token in JavaScript |
| Local MongoDB, not Atlas | Offline support |
| Static export served by Express | One origin; no proxy buffering of streamed answers |
| No LangChain; small own agent loop | Understandable code |

## 11. Open items

- Abuse control for open signup: CAPTCHA services need internet, so start with per-IP limits, honeypot and admin disable; consider WhatsApp/SMS verification later.
- Password reset for public users (admin-assisted for now; email or WhatsApp reset when online).
- Wording of the signup privacy notice (chats are stored and visible to staff).
- Seven Towers real `system.md` / `knowledge.md` content (images and tables).
- Golden question set.
- Domain name for Cloudflare Tunnel.
- Backup target for MongoDB.
- Final model choice via evals.