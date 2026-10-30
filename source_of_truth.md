# company-ai — Source of Truth

> What exists, where it lives, and how we work. Update this file in the same commit as any architectural change.
> Last updated: 2026-10-30

## 1. What this is

On-premise AI assistants and creative tools for the company, powered by one self-hosted LLM and one self-hosted image/video engine on an NVIDIA DGX Spark (Linux, ARM64, 128 GB memory shared by CPU and GPU).

| # | App | Purpose | Status |
|---|---|---|---|
| 1 | `seven-towers-bot` | Q&A on the Seven Towers project from ≤10 pages of company data, for the public (prospective buyers). Proof of concept | In development |
| 2 | `hub-bot` | Bosses-only assistant over the cloud CRM / EMS / HR / CMS via tool calling | Planned |
| 3 | `social-bot` | Replies to WhatsApp / social comments / app reviews, human approval for decisions | Planned |
| 4 | `studio` | Staff-only image and video generation app (accounts, job queue, fixed presets) on top of ComfyUI | Queue + Comfy + telemetry + HTTP API live; create UI next |

Build order: 1 → 2 → 3. `studio` is a parallel track and shares the GPU with bot 1.

**Principles:** model-agnostic and local/cloud-agnostic (switch by config only) · bot 1 works offline · simple over clever (<10K requests/day, no overkill) · evals before trust · every line understandable · users never touch an inference engine directly.

## 2. Architecture

```
Browser (LAN, tailnet or public tunnel)    one address per app, relative URLs
   │
   ├──► seven-towers-bot  (Express :4000, public via tunnel)
   │        ├──► MongoDB (bot)                                  [internal only]
   │        └──► vLLM :8000  (OpenAI-compatible API + key)      [internal only]
   │
   └──► studio  (Express :4001, tailnet only, never public)
            ├──► MongoDB (studio)                               [internal only]
            └──► ComfyUI :8188  over Docker network `studio-engine`   [internal only]

Weights: ~/.cache/huggingface (LLM) · ~/comfyui/models (image/video)   [never in Git]
```

- Only app backends talk to vLLM. Only the Studio backend talks to ComfyUI. Browsers and users never talk to either.
- All LLM apps use the standard OpenAI-style interface. Switching to a cloud model = change `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`.
- No runtime calls to outside services (CDNs, fonts, analytics), so LAN/offline mode works.

## 3. Repository layout

```
company-ai/
├── SOURCE_OF_TRUTH.md
├── .cursor/rules/          AI coding rules (carry the practices in section 10)
├── apps/
│   ├── seven-towers-bot/
│   │   ├── backend/        Express + TypeScript API
│   │   │   ├── src/        config · routes · controllers · services · guardrails · middleware · lib
│   │   │   ├── knowledge/<project>/   system.md · knowledge.md · images/ · source/ (gitignored)
│   │   │   ├── tests/
│   │   │   └── .env.example
│   │   └── frontend/       Next.js App Router (static export → out/)
│   │       └── src/        app · components/{ui,layout,auth,chat,rich,admin} · hooks · lib
│   └── studio/             npm workspaces: shared · backend · frontend (full tree in §8.13)
│       ├── shared/         Zod schemas + types used by both sides (@studio/shared, built to dist/)
│       ├── backend/
│       │   ├── src/        compose · config · routes · controllers · services · db · middleware · lib · telemetry · comfy · queue · events · limits
│       │   ├── recipes/<id>/   manifest.json · workflow.api.json   (one folder per recipe)
│       │   ├── scripts/    seed-admin · telemetry-demo · comfy-smoke · queue-smoke · api-smoke
│       │   ├── tests/
│       │   └── .env.example
│       └── frontend/       Next.js App Router (static export → out/)
│           └── src/        app · components/{ui,layout} · features/{auth,admin} · lib  (create/library/tool-form planned)
├── infra/
│   ├── vllm/               docker-compose.yml · .env.example
│   └── comfyui/            Dockerfile · docker-compose.yml · workflows/ (UI-format originals) · .env (gitignored)
├── evals/                  datasets/ · runners · results/
├── packages/               shared code (create only when 2+ apps need it)
└── docs/                   longer notes
```

## 4. Self-hosted inference

### LLM (`infra/vllm`)

- **Engine:** vLLM (`vllm/vllm-openai:v0.20.0`) in Docker Compose. `infra/vllm/docker-compose.yml` is the source of truth for all flags.
- **Model (provisional until evals confirm):** `Qwen/Qwen3.6-35B-A3B-FP8`, served as `qwen3.6`.
- **Endpoint:** `http://localhost:8000/v1`, bound to localhost, protected by `VLLM_API_KEY`.
- **Key settings:** 32K context · `--gpu-memory-utilization 0.40` · 8 concurrent requests · prefix caching on · reasoning and tool parsers set · thinking OFF by default per request.
- **Weights:** `~/.cache/huggingface`, mounted into the container. Never committed.
- **Ops** (from `infra/vllm`): `docker compose up -d` · `ps` · `logs -f` · `down`.

### Image and video gen (`infra/comfyui`)

- **Engine:** ComfyUI **v0.41.0** (runs Flux 3, Z-Image, LTX-2.5 and Wan 2.2), always-on. Image `company-ai/comfyui:local` from NVIDIA's DGX Spark playbook Dockerfile (NGC PyTorch `26.02-py3`; ComfyUI deps installed without replacing NGC torch; torchaudio stubbed for NGC ABI). Listens `0.0.0.0:8188` inside the container.
- **Start flags (added to the existing command):** `--disable-api-nodes` (no Comfy.org cloud/partner nodes; the frontend makes no internet calls) · `--disable-metadata` (outputs carry no embedded workflow, so model names never leak through files).
- **Isolation:**
  - Docker network `studio-engine` (create once: `docker network create studio-engine`) has exactly two members: ComfyUI and the Studio backend. Bot, vLLM and Mongo are not on it.
  - Host bind is `127.0.0.1:8188` only, for the admin (Cursor **Ports** forward) to author and export workflows. Nobody else opens the ComfyUI UI.
  - Verified 2026-10-28: socket listens on `127.0.0.1:8188` only; a container on `studio-engine` reaches `http://comfyui:8188`; a container on `company-ai` gets no response (curl timeout).
- **Mounts:** `${COMFY_HOME}/models` **read-only** (nobody can add or download models; admin downloads on the host) · `${COMFY_HOME}/input` and `output` read-write · `${COMFY_HOME}/user` read-write (saved workflows and settings survive container recreation).
- **Models** (weights outside Git under `COMFY_HOME` → `~/comfyui/{models,input,output,user}`):
  - **Z-Image-Turbo BF16** — `z_image_turbo_bf16.safetensors` + `qwen_3_4b.safetensors` + `ae.safetensors` (`Comfy-Org/z_image_turbo` split_files). Fast text-to-image.
  - **FLUX 3 Image Klein** (gated `black-forest-labs/flux-3-image-klein-comfy`) — distilled BF16 `flux3-image-klein-bf16.safetensors` + `qwen3vl_4b_bf16.safetensors` + `flux2-vae.safetensors` + prompt upsampler `qwen3.5_9b_flux3_prompt_upsampler_int8_convrot.safetensors`. Quality text-to-image, image edit, multi-reference. Base/int8/w4a8 variants are not used and are not downloaded.
  - **LTX-2.5 distilled (video, with audio)** — gated `Lightricks/LTX-2.5`, license cleared for our use: `diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors` · `text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors` · `vae/ltx-2.5-video-vae-bf16.safetensors` · `vae/ltx-2.5-audio-vae-bf16.safetensors` · `latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors`; optional prompt enhancer `text_encoders/gemma4_e2b_it_int8_convrot.safetensors` (from `Comfy-Org/gemma-4`, off by default). About 40–45 GB.
  - **Wan 2.2 14B (parked, no product use)** — `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` fp8_scaled T2V/I2V pairs, `umt5_xxl_fp8`, `wan_2.1_vae`, lightx2v 4-step LoRAs. About 70 GB. Much slower than LTX in our tests. Kept only as an Apache-2.0 fallback; delete if the disk is needed.
- **Workflows:** the Studio uses API-format exports stored with each recipe (`apps/studio/backend/recipes/<id>/workflow.api.json`, see section 8). `infra/comfyui/workflows/` holds only UI-format originals used for authoring. Only the Z-Image and distilled BF16 Klein graphs are kept.
- **Limits:** `gpus: all` · `mem_limit` / `memswap_limit` **60g** (equal = no container swap) · `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`. Models load on first use and stay cached while room remains; switching between model families can trigger a reload. Watch `docker stats`.
- **Ops** (from `infra/comfyui`): `docker compose up -d --build` · `logs -f` · `down`. Before a cold model load on the Spark: `sync; echo 3 | sudo tee /proc/sys/vm/drop_caches` — page cache of model files shares the unified CPU/GPU pool; "free" can look low until cache is dropped (reclaimable).
- **Observed:** with an image generating, the bot answers slightly slower but works. LTX-2.5 is fast enough for staff use; Wan 2.2 is not.

### Shared memory / GPU

One unified pool on the Spark. vLLM reserves a fixed share (0.40 of memory) at all times. ComfyUI's container is capped at 60g; it does not reserve memory while idle, and an out-of-memory kill only ends that ComfyUI job. Both engines use the GPU, so a generation can briefly slow the bot. The Studio queue (section 8) is the control point for this: it runs one generation at a time and can be paused by an admin.

## 5. Adding a new model

1. `hf download <org/model>` (venv: `~/venvs/hf`). For ComfyUI models, download on the host into `~/comfyui/models/<type>/`.
2. LLM: in the compose file change the model ID, `--served-model-name`, and parser flags (see the model card). ComfyUI: refresh the model list in the UI (`r`).
3. `docker compose up -d`, wait for "startup complete", check `/v1/models` (LLM) or run the workflow once (ComfyUI).
4. Set `LLM_MODEL` in each app's `.env` (LLM only).
5. Run evals on old vs new. Keep the new model only if accuracy is at least as good and latency is acceptable. For image/video, compare outputs and timings on the same prompts.
6. Record it in the Decisions log. Roll back by reverting the compose file or removing the files.

## 6. Adding a new app

1. Create `apps/<name>/{backend,frontend}` with the same layers as `seven-towers-bot`.
2. Give it its own `.env`, port (next free: 4002…) and MongoDB database name.
3. Give it its own `knowledge/` pack and `evals/datasets/<name>` where it uses an LLM.
4. Reach the LLM only through the app's `llm.service.ts` using the standard env vars. Extract to `packages/llm-client` when a second app needs the same code.
5. Add a compose service and a row in the table in section 1.
6. Update this file.

A new *project* for an existing app (for example another property) is just a new folder in `knowledge/`, with no code change. A new Studio capability is just a new folder in `apps/studio/backend/recipes/` (section 8).

## 7. seven-towers-bot (existing app)

- **Goal:** proof of concept: accurate, fast answers on company data, running locally on the Spark, for the public.
- **Stack:** Express + TypeScript backend · Next.js static export served by Express (prod: one port, 4000; dev UI on 3000) · MongoDB · vLLM.
- **Accounts:** open registration with admin approval. Anyone signs up with email, full name and phone number (all required; phone stored in E.164 format; contact details are unverified). New accounts start as `pending` and cannot sign in or use the chatbot until an admin sets status to `active`. Roles: `user` (everyone who signs up) and `admin`. Admin sees all users and their full chat sessions, and can approve, disable, re-enable, or reset a user. The first admin is created with `npm run seed:admin`, never through signup. Every admin view of a user's chats is written to `audit_logs`. The signup screen tells users that chats are stored and visible to company staff.
- **Sessions and passwords:** server-side sessions in an httpOnly cookie, argon2id hashing, no email dependency (password resets are admin-assisted for now).
- **Chat:** `POST /api/chat` streams over SSE with events `meta`, `token`, `attachment`, `done`, `error`.
- **Knowledge:** two files per project (`system.md` + `knowledge.md`). The full knowledge base goes in the prompt (no RAG). Tables and images are parsed from `knowledge.md` (table markers + GFM tables; markdown image refs). `Last updated: YYYY-MM-DD` is required near the top. Reload validates first; on failure the previous in-memory pack is kept. `npm run knowledge:check` uses the same rules.
- **Rich results:** images live in `knowledge/<project>/images/` (WebP + thumbs from `source/` via `assets:build`). The model calls `show_images({ files, caption? })` with names as written in the knowledge base (no `images/` prefix or `.webp` suffix). Unknown names are dropped and the tool result suggests the closest valid ones. The backend emits `attachment` events; the UI renders a gallery. Clear floor-plan / map asks (and "yes" after an offer to show plans) set `tool_choice` to force `show_images`; if the model still answers in text only, the agent nudges once and forces the tool again. Prior assistant turns get an LLM-only history tag `<images_shown>…</images_shown>` (not user-facing); echoed markers are stripped in the output guard (before persist) and in the UI. Tables, lists and headings are ordinary Markdown in the answer (GFM pipe tables); the UI renders them with `react-markdown` + `remark-gfm`. The model never writes image URLs. Only files in the parsed image map (and their thumbs) are served, and only to logged-in users. Knowledge-base `<!-- table: id -->` markers are still validated when loading packs; there is no `show_table` tool.
- **Unknown-question registry:** the model may call terminal tool `report_gap({ need })` when a legitimate project/company/buying question is not fully covered by the knowledge base. Shared instructions live in `backend/prompts/gap-reporting.md` and are appended at the end of the system prompt (after the knowledge base) so prefix caching still works. Sole `report_gap` ends the turn without another LLM call; if no text was streamed, the user sees "I don't have that information yet." Mixed with other tools (e.g. `show_images`), the tool result is `recorded` and the loop continues. Gaps are upserted into `knowledge_gaps` after the SSE `done` event (fire-and-forget; max 20 reports/user/day). Persisted chat history is text only — `report_gap` is never replayed. Admins manage unknowns at `/admin/gaps/` (`GET/PATCH /api/admin/gaps`).
- **Guards:** message ≤1,500 chars · answer ≤1,024 tokens · last ~10 messages within the context budget · 20 requests/min and 200/day per user · 5 signups/hour per IP · hidden honeypot field on the signup form · max 6 answers in flight (else 503 "busy") · `trust proxy` for real visitor IPs · input injection flags · output fallback message.
- **MongoDB collections:** `users` (email, fullName, phone, passwordHash, role `user` or `admin`, status `pending` | `active` | `disabled`), `sessions`, `conversations`, `messages`, `audit_logs`, `knowledge_gaps` (unique normalized `key`, `need`, `count`, status `open` | `resolved` | `ignored`, timestamps, last question/conversation, last asker name/email, reopenCount).
- **UI:** premium iOS-style (Open WebUI-inspired layout), animated, responsive (phone, tablet, desktop), light/dark/system theme, safe-area aware, respects reduced motion. Tailwind v4 + Motion. System font stack with self-hosted Inter Variable fallback. No external assets; Express CSP enforces `default-src 'self'` (scripts/styles allow `'unsafe-inline'` for Next static hydration; `upgrade-insecure-requests` disabled for plain-HTTP LAN). Optional voice dictation in the composer via the browser Web Speech API (mic next to send; live transcript into the field; never auto-sends). Needs a secure context and often a network connection in Chromium; unsupported browsers hide the mic. Admin tabs: Users, Audit, Unknowns (`/admin/gaps/`).

## 8. studio (new app)

### 8.1 Goal and shape

Staff (marketing first) generate images and videos from one simple branded app. ComfyUI is the engine behind it and is never exposed. Users pick **presets** (aspect ratio, quality, duration), never models, graphs or nodes. Product name is a placeholder ("Minimal Studio"), kept in one config constant. Stack: Express 5 + TypeScript backend · Next.js static export served by Express (prod: one port, 4001; dev UI on 3001) · MongoDB (own container, database `studio`) · ComfyUI over `studio-engine`.

### 8.2 How a request flows

1. Caller (`POST /api/threads/:id/generations`, or `GenerationService` / `queue:smoke`) validates input, checks quotas and reserves a daily run (section 8.5).
2. **Recipe resolver** (`pick-recipe.ts`) uses shared `pickMode` against each recipe’s `match` (tool + input image count + optional variant). The user never chooses a workflow. Missing recipe → `UNSUPPORTED_COMBINATION`.
3. A `jobs` document is saved as `queued`; the event hub publishes `job.queued` with position; the worker is woken. Empty thread titles are set from the first prompt (60 chars).
4. A single worker loop claims the next eligible job when the engine is ready and not paused.
5. The ComfyUI client copies the recipe graph in memory, sets allowed values by node title, a **fresh random seed** and `filename_prefix`, then `POST /prompt`.
6. One persistent WebSocket delivers progress; the worker maps node class → UI stage and publishes `job.progress` (never node/class/recipe names). Telemetry gets `runStart` / `runEvent` / `runEnd`.
7. On success: bytes → `DATA_DIR/<userId>/<assetId>.png`, WebP thumb (sharp, max 512 px), `assets` insert, job `done`, `job.done`, `usage_daily.gpuSeconds` += runMs/1000.
8. On failure/cancel: map to job `errorCode`, refund when the rules say so, publish `job.failed` / `job.cancelled`.

HTTP adapters for generate / events / files / library / capabilities / admin jobs·runs·engine·settings are wired (section 8.7). Why it stays fast: in-memory graph patch; one WebSocket; warm-up at boot; no LLM hop.

### 8.3 One pipeline for create and edit

The UI has **one composer per output type** (Image, Video) inside a thread. A thread is a conversation: each message is a job, each job produces assets. Internally there are separate ComfyUI graphs (**recipes**), but the user is never sent to a different tool. The resolver chooses by what is attached to the message:

| Output | Input images attached | Quality preset | Recipe id | Engine graph (internal only) |
|---|---|---|---|---|
| image | 0 | fast | `image-create-fast` | Z-Image-Turbo text-to-image |
| image | 0 | best | `image-create-quality` | Flux Klein text-to-image |
| image | 1 | — | `image-edit` | Flux Klein image-to-image |
| image | 2–4 | — | `image-reference` | Flux Klein multi-image |
| video | 0 | — | `video-from-text` | LTX-2.5 text-to-video |
| video | 1 | — | `video-from-image` | LTX-2.5 image-to-video |
| video | 2 (first, last) | — | `video-between-frames` | LTX-2.5 first/last frame |

Rules:

- **The working image is explicit state, not a guess.** After a result appears, it becomes the thread's *working image* and shows as a chip above the composer ("Editing this image ✕"). The next message with the chip attached is an edit. Removing the chip makes the next message a new image. The chip is sent as `inputAssetIds`; the server never infers intent from the prompt text.
- Any earlier result in the thread (or an upload, or a library image) can be clicked "Use as base". Each edit is a new job and a new asset with `parentAssetId`, so the thread is a visible history and branches are possible.
- 2–4 attached images switch to `image-reference` automatically. Video from an image result is an "Animate" action in the same thread: the output switches to Video with the image attached.
- No LLM router. It would add a second model call (latency, GPU contention, nondeterminism) for something the chip already states explicitly.
- Input images reach ComfyUI via `POST /upload/image` as `studio_<assetId>.png`. The backend remembers what it already uploaded.
- Edit output size follows the input's aspect ratio, snapped to the allowed size presets.
- Z-Image and Klein are different model families, so alternating them can reload a model. A later scheduler improvement groups queued jobs by family.
- Capabilities are driven by the recipes present. The UI only offers what `GET /api/capabilities` reports (for example no audio tool until a recipe exists).

### 8.4 Recipes (the ComfyUI contract)

- One folder per recipe in `backend/recipes/<id>/`: `workflow.api.json` (the "Export (API)" file from ComfyUI) and `manifest.json` (id, tool `image`|`video`, `timeoutSeconds`, **`match`** `{ tool, inputImages:{min,max}, variant? }`, params with text/enum targets + presentation fields, seed target, output title + prefix field). Path from env `RECIPES_DIR` (default `./recipes`).
- **Match + presentation:** each param has `label`, optional lucide `icon` (kebab-case), `group` `primary`|`settings`; enum options have `label` and optional `icon`. `sizes` and `target` stay server-only and never appear in `GET /capabilities`. Boot rejects overlapping `(tool, imageCount, variant)` matches; when several variants cover the same image count, exactly one must have `default: true`.
- **Nodes are found by title, never by id.** Title convention: `IN_PROMPT`, `IN_SIZE`, `IN_SAMPLER`, `IN_IMAGE_1…4`, `OUT_IMAGE`, `OUT_VIDEO`. Node ids are opaque strings (e.g. `"57:8"`). At boot `loadRecipes` validates both JSON files with Zod, builds a title → nodeId index, and refuses to start if any manifest title is missing, duplicated, or missing a target input field.
- Everything not in the manifest stays locked in the file (steps, cfg, sampler, models, `batch_size`). `patchGraph` structuredClones the stored graph, writes only allowed params, fills enum defaults, sets a fresh random seed (`crypto.randomInt`, below 2**48) and `filename_prefix = studio/<jobId>`, and returns resolved values (e.g. width/height). It never mutates the recipe on disk.
- `image-create-fast` (Z-Image-Turbo) is live: `match` `{ tool:image, inputImages:{0,0}, variant:{id:fast,label:"Fast",icon:zap,default:true} }`; aspect ratio options Square 1:1 / Portrait 4:5 / Landscape 16:9 / Story 9:16.

| Title | Class | Backend writes |
|---|---|---|
| `IN_PROMPT` | CLIPTextEncode | `text` (param `prompt`, maxLength 1000) |
| `IN_SIZE` | EmptySD3LatentImage | `width`, `height` from `aspectRatio` enum (1:1 → 1024×1024, 4:5 → 896×1120, 16:9 → 1344×768, 9:16 → 768×1344; all multiples of 16). `batch_size` stays 1 |
| `IN_SAMPLER` | KSampler | `seed` (fresh per job). Locked: steps 8, cfg 1, `res_multistep`, `simple` |
| `OUT_IMAGE` | SaveImage | `filename_prefix` = `studio/<jobId>` |

- ComfyUI endpoints used by the client: `POST /prompt` (with `client_id` + caller-chosen `prompt_id`) · WebSocket `/ws?clientId=` · `GET /history/{id}` · `GET /view` · `POST /interrupt` · `GET /queue` · `POST /queue` (delete prompt ids) · `GET /system_stats`. Upload (`POST /upload/image`) comes later with edit/reference recipes.
- Unlike the original idea of exposing templates, no user-built workflows exist. Adding a capability = authoring a graph in ComfyUI (admin), exporting API format, titling nodes, writing a manifest. If a graph needs a custom node, the engine image is rebuilt (custom nodes are not user-installable).
- Failures from ComfyUI become generic engine codes only: `ENGINE_UNAVAILABLE`, `ENGINE_TIMEOUT`, `ENGINE_FAILED`, `ENGINE_CANCELLED`, `ENGINE_BAD_OUTPUT`. Full Comfy detail goes to the logger only, never into user-visible messages.

### 8.4.1 ComfyUI client (`src/comfy/`)

Self-contained module; the only Studio code that talks to ComfyUI. Must not import telemetry, Express, Mongo or db code. Uses Node's built-in `fetch` and `WebSocket` (no extra runtime dependency for the client). Depends on `sharp` only in the queue layer for thumbnails, not here.

- **Interfaces (tests use fakes):** `ComfyHttp` (submit / history / view / interrupt / queue → `{running,pending}` prompt ids / `clearPrompt` / ping) · `ComfyEvents` (subscribe by `prompt_id` / `isConnected`).
- **Socket:** one persistent WebSocket per process, one `clientId`, auto-reconnect with capped backoff; `onConnected` fires on reconnect (not the first open) so warm-up can re-arm; `close()` clears the reconnect timer. Ignores binary preview frames; Zod-parses known text frames; unknown/malformed frames logged at debug and dropped.
- **`runComfyPrompt`:** subscribe before submit (client supplies `prompt_id`) → hooks (`onSubmitted`, `onCached` with `{nodeId,nodeClass,nodeTitle?}`, `onNodeStart`, `onProgress`) → finish on `execution_success` / `executing` null → read history + `/view` for the `OUT_IMAGE` node (bytes in memory). Safety net: poll history every 5 s. Timeout (manifest `timeoutSeconds`) or `AbortSignal` → `/interrupt` then `ENGINE_TIMEOUT` / `ENGINE_CANCELLED`.
- **Factory:** `createComfy({ env, logger, onReconnect? })` → `{ recipes, run, collect(recipeId, promptId), queue, interrupt, clearPrompt, ping, close }` (`run` = `patchGraph` + `runComfyPrompt`; `collect` = history + `collectOutputFromHistory` for boot recovery).
- **Smoke:** `npm run comfy:smoke` → `scripts/comfy-smoke.ts` hits the real engine and wires real telemetry in the script only (`--prompt`, `--aspect`, `--repeat`, `--verbose`, `--cancel-after`). Saves PNGs under `./tmp/smoke/` (`tmp/` gitignored). Ends with `telemetry.flush()` then `comfy.close()` then `process.exit(0)`.

### 8.5 Queue, limits, events and composition

#### 8.5.1 Composition root (`src/compose.ts`)

`compose()` builds and returns everything: validated env, logger, Mongo, `ensureIndexes` for all collections (including `audit_logs`), `MongoMetricsStore.ensureIndexes()`, repositories, `createComfy`, telemetry (Mongo store + `SystemSampler`), event hub, `LimitsService`, queue worker, `GenerationService`, and HTTP services (`CapabilitiesService`, `ThreadService`, `GenerationQueryService`, `FilesService`, `LibraryService`, `AdminStudioService`) as `api`. `server.ts` calls `compose()`, passes `api` into `createApp`, starts `worker.start()`, and on SIGTERM/SIGINT: stop claims → wait up to 30 s for the running job → `telemetry.flush()` → `comfy.close()` → hub close → `closeMongo()`.

#### 8.5.2 Limits (`src/limits/`)

- **Defaults** (`defaults.ts`): image 100 / video 10 daily runs; per user 1 running + 3 queued; global queued cap 30. Merged with `settings.limits` overrides.
- **Day key:** `YYYY-MM-DD` in `STUDIO_TIMEZONE` (IANA, default UTC).
- **`reserveRun(userId, tool)`:** atomic `findOneAndUpdate` on `usage_daily` that increments `runs` only while `runs < dailyRuns` (upsert-safe; duplicate-key race retried).
- **Refund (−1 run)** when: job cancelled while still `queued`; or job fails with `ENGINE_FAILED` | `ENGINE_UNAVAILABLE` | `ENGINE_BAD_OUTPUT`. Cancel while running or a finished job counts (no refund).
- **On job end:** add `runMs/1000` to `gpuSeconds`.
- **`checkSubmit`:** throws typed `AppError` with only `QUOTA_DAILY` | `QUOTA_ACTIVE` | `QUEUE_FULL` (also in `@studio/shared` error codes). `remaining(userId)` → per tool `{ dailyRuns, used, remaining }`.
- Other product limits still planned for HTTP: prompt ≤1,000 chars (enforced in `GenerationService` Zod), ≤4 input assets, upload size, fixed size/duration presets, per-job Comfy timeout from the recipe manifest.

#### 8.5.3 Scheduler and worker (`src/queue/`)

- **Scheduler** (`scheduler.ts`, pure): `orderQueue(queued, lastServedAt)` → images before videos; within a tool band, least-recently-served user first (round-robin); within a user, oldest `timings.queuedAt` first. Index 0 is next; index+1 is the 1-based SSE position.
- **One worker loop** (`worker.ts`): woken by an EventEmitter or a 2 s timer. Sets `busy` before any await so overlapping wakes cannot double-claim. Skips while `settings.enginePaused` or engine ping state is `unavailable`. Claims atomically (`queued` → `running`, `attempts++`).
- **Engine monitor** (`engine-state.ts`): ping every `ENGINE_PING_INTERVAL_MS` (default 10_000) → `ready` | `unavailable`; `paused` overlays from settings; publishes `engine` events. Admin `PATCH /admin/engine` calls `setPaused` immediately (does not wait for the next ping) and wakes the worker.
- **Run** (`run-job.ts`): `Map<jobId, AbortController>` for cancel; `comfy.run` with hooks → telemetry + hub. Stage from node class (`stage.ts`): `Sampler` → `generating`, `VAEDecode`/`Save*` → `finishing`, else `preparing`. Success writes file + sharp WebP thumb (`write-output.ts`), inserts asset, finishes job. Telemetry/publish failures never break the loop.
- **Cancel** (`cancel.ts`): queued → `cancelled` immediately + refund; running → abort controller (Comfy `/interrupt`), ends as `cancelled` (no refund).
- **Recovery** (`recovery.ts`) at boot for each `running` job: history has output → `comfy.collect` + finish `done`; Comfy still holds the prompt → interrupt/clear + requeue; else requeue if `attempts < 2`, otherwise fail `ENGINE_FAILED` + refund. If Comfy is unreachable, leave jobs alone (worker will not claim while unavailable).
- **Warm-up** (`warm-up.ts`): once at boot and after socket reconnect, when idle and nothing queued, one throwaway `image-create-fast` run (no job row, no usage, no telemetry). Awaited cancel before a real claim so `/interrupt` cannot kill the user job. Skipped if a real job arrives first.
- **Retention** (`retention.ts`): daily timer soft-deletes assets older than `RETENTION_DAYS` (default 30) and unlinks file + thumb.

#### 8.5.4 Event hub (`src/events/` + `@studio/shared`)

Per-user SSE hub (`hub.ts`): `Map<userId, Set<connection>>`, max 5 connections per user (drop oldest), heartbeat comment every 25 s, no replay. Programmatic `subscribe` so tests and `queue:smoke` work without HTTP. After every queue change, recompute positions and emit `job.position` to affected owners.

Shared Zod discriminated union (`shared/src/schemas/events.ts`, reused by the future frontend):

| Event | Payload |
|---|---|
| `job.queued` | `jobId`, `threadId`, `position` |
| `job.position` | `jobId`, `position` |
| `job.started` | `jobId` |
| `job.progress` | `jobId`, `stage` (`preparing`\|`generating`\|`finishing`), `value?`, `max?` |
| `job.done` | `jobId`, `assetIds` |
| `job.failed` | `jobId`, `errorCode` |
| `job.cancelled` | `jobId` |
| `engine` | `state` (`ready`\|`paused`\|`unavailable`) |

`GET /api/events` HTTP adapter: auth required; `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`; hub heartbeat → SSE comment; unsubscribe on close.

#### 8.5.5 Generation service

`GenerationService.createGeneration(userId, threadId, input)`: Zod-validate `{ tool, prompt, values, variant?, inputAssetIds }` → `pickRecipe` / `pickMode` against loaded recipe `match` fields (SOT table in 8.3; only `image-create-fast` exists on disk today) → `checkSubmit` → `reserveRun` → insert job → wake worker → `job.queued`. Unsupported attachment/recipe combo → `UNSUPPORTED_COMBINATION`. HTTP wraps this via `GenerationQueryService` (202 + `toUserJob`, cancel via `worker.cancel`, first-prompt thread title).

#### 8.5.6 Smoke

- `npm run queue:smoke` → `scripts/queue-smoke.ts`: real Mongo + real engine; two throwaway users; A×3 + B×1 via `GenerationService`; prints queue order, every hub event, final statuses, `job_metrics` (including `warm`); deletes users/files; exits by itself. Stop any other Studio backend (`dev`) first so two workers do not share the queue.
- `npm run api:smoke` → `scripts/api-smoke.ts`: against a running server (`http://127.0.0.1:4001`); `SMOKE_EMAIL` / `SMOKE_PASSWORD`; login → capabilities → create thread → one generation → SSE until `job.done` → download file → print summary → exit.

### 8.6 Data model (MongoDB, database `studio`)

- `users`: email, fullName, passwordHash, role `user` | `admin`, status `pending` | `active` | `disabled`, createdAt, updatedAt, …
- `sessions`: server-side sessions (httpOnly cookie).
- `threads`: userId, title, createdAt, updatedAt, deletedAt?.
- `jobs`: userId, threadId, tool (`image`\|`video`), recipeId, variant?, status `queued`\|`running`\|`done`\|`failed`\|`cancelled`, prompt, params (validated user-facing values), inputAssetIds, outputAssetIds, parentAssetId?, comfyPromptId?, errorCode?, attempts, timings `{ queuedAt, startedAt?, finishedAt? }`. Indexes: `{ status, tool, timings.queuedAt }`, `{ userId, status }`, `{ threadId }`.
- `assets`: userId, threadId?, jobId?, kind `image`\|`video`, filePath, thumbPath, mime, bytes, width, height, durationSec?, source `upload`\|`generated`, parentAssetId?, createdAt, deletedAt?.
- `usage_daily`: userId, day (`YYYY-MM-DD` in `STUDIO_TIMEZONE`), tool, runs, gpuSeconds. Unique index `{ userId, day, tool }`.
- `audit_logs`: admin actions (e.g. admin viewing another user’s non-thumb asset via `GET /files/:id`).
- `settings`: singleton document `{ enginePaused, limits }` (dailyRuns / perUserRunning / perUserQueued / globalQueued overrides).
- `job_metrics`: per-generation telemetry row (section 8.12). Written by the worker via telemetry; TTL via `TELEMETRY_RETENTION_DAYS` (default 90). Indexes ensured at boot.

### 8.7 API surface (`/api`)

Public DTOs, Zod request schemas, `pickMode`, `PRODUCT_NAME` ("Minimal Studio"), and `DEPARTMENTS` live in `@studio/shared`. User job DTO never includes `recipeId` / node / model / workflow names; admin job DTO includes `recipeId`. Capabilities are built from loaded recipes (new recipe folder → new mode, no route change); serialized JSON must not leak `IN_`/`OUT_` titles, recipe ids, or model words.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /me` |
| Capabilities | `GET /capabilities` (product, engine state, tools/modes/controls, per-tool quota remaining, activeCap) |
| Threads | `POST /threads` · `GET /threads` (cursor, newest first) · `GET /threads/:id` (thread + items `[{job,assets}]`) · `DELETE /threads/:id` (soft delete + unlink asset files) |
| Generate | `POST /threads/:id/generations` (202 + job; rate limit 30/min/user) · `GET /generations/:id` · `DELETE /generations/:id` (cancel) |
| Uploads | `POST /uploads` (images; validated and re-encoded) — not wired |
| Live | `GET /events` (SSE; event shapes in `@studio/shared`) |
| Files | `GET /files/:assetId` (`?thumb=1`, `?download=1`; `Cache-Control: private, immutable`; path from DB only) · `DELETE /assets/:id` (owner or admin) |
| Library | `GET /library?kind=image\|video&cursor&limit` (own, not deleted) |
| Admin | `GET/PATCH /admin/users` · `GET /admin/jobs` · `GET /admin/runs` · `GET /admin/runs/:jobId` · `GET/PATCH /admin/engine` · `GET/PATCH /admin/settings` |

Production static serve: `apps/studio/frontend/out` via `mountFrontendStatic` (trailingSlash page fallbacks, no SPA catch-all over `/api`, CSP as in §8.10 / helmet).

### 8.8 Accounts

Account creation is free but needs admin approval. Signup fields: full name, email, password, department, optional note. New accounts are `pending` and cannot sign in until an admin sets `active`; the login screen says so plainly. First admin: `npm run seed:admin`, never through signup. Sessions: server-side, httpOnly cookie `studio_sid`, argon2id. No email dependency: password resets are admin-assisted. No Google or SSO login (needs the internet). Limits: per-IP signup rate limit, honeypot field, login rate limit. The signup screen states that generations are stored and visible to admins. Auth code is written inside Studio for now; extract to `packages/auth` once Studio is stable and a second app needs it.

### 8.9 Hiding the engine

- The API and UI use only product wording ("Fast", "Best quality", "Edit"). No model names, node names or workflow names ever leave the backend.
- ComfyUI errors are replaced by the generic `ENGINE_*` codes (section 8.4) for users and logged in full for the admin.
- Output files carry no embedded workflow (`--disable-metadata`); files are re-encoded on download if needed.
- Check each model license's attribution wording before dropping credit everywhere (Klein and LTX terms).

### 8.10 UI

- Screens: Login · Request account (with a pending-approval state) · Home (greeting, composer, recent) · Create image (thread) · Create video (thread) · My Generations (All / Images / Videos; download, delete) · Admin (Dashboard, Users and approvals, Jobs, Engine pause, Settings) · mobile tab bar (Home, History, Profile).
- The mockup's separate per-tool pages collapse into the two thread composers above. Removed from the mockup: the model dropdown and "Model" field, Google/SSO login, the Audio to Audio tile (until a recipe exists), "approval email" copy.
- Stack: Next.js static export (`output: 'export'`, `trailingSlash`, one `/create/` page reading `?tool=` because static export cannot pre-build dynamic tool routes) · Tailwind v4 · Radix (`radix-ui`) · Motion · lucide · TanStack Query · react-hook-form + Zod · `next-themes` (light/dark/system, no flash) · `sonner` toasts · self-hosted Inter Variable. No external assets; strict CSP.

### 8.11 Run and status

- **Workspaces:** `apps/studio` root `npm install` links `shared`, `backend`, `frontend`. Scripts: `npm run dev:backend` (API :4001) · `npm run dev:frontend` (UI :3001) · `npm run typecheck | lint | test` · `npm run build -w @studio/shared` before building the others. Backend also: `npm run seed:admin` · `npm run telemetry:demo` · `npm run comfy:smoke` · `npm run queue:smoke` · `npm run api:smoke`.
- **Backend env (`.env.example`):** `NODE_ENV`, `PORT=4001`, `LOG_LEVEL`, `MONGODB_URI`, `COMFY_URL` (default `http://127.0.0.1:8188`; compose uses `http://comfyui:8188`), `RECIPES_DIR` (default `./recipes`), `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `TRUST_PROXY`, `CORS_ORIGIN`, `DATA_DIR`, `TELEMETRY_ENABLED`, `TELEMETRY_SAMPLE_INTERVAL_MS`, `TELEMETRY_RETENTION_DAYS`, `STUDIO_TIMEZONE` (IANA, default UTC), `RETENTION_DAYS` (default 30), `ENGINE_PING_INTERVAL_MS` (default 10000). All validated with Zod at boot (`TELEMETRY_ENABLED` is an explicit `'true'|'false'` string — never `z.coerce.boolean()`). Smoke: `SMOKE_EMAIL`, `SMOKE_PASSWORD`, optional `SMOKE_BASE_URL`.
- **Storage:** results under `DATA_DIR/<userId>/` (PNG + `.thumb.webp`); retention soft-delete after `RETENTION_DAYS`. Smoke PNGs under `./tmp/smoke/` (gitignored; not product storage). Dependency: `sharp` (linux-arm64 prebuilt) for thumbnails.
- **Status (2026-10-30):** ComfyUI isolation verified; auth + admin live; Comfy client + `image-create-fast` live; job pipeline live; **HTTP public contract live** (capabilities, threads, generations, SSE `/events`, files, library, admin jobs/runs/engine/settings; `@studio/shared` DTOs + `pickMode`; static export serving with trailingSlash fallbacks). **Not yet:** frontend create/library screens; uploads; Klein/LTX recipes.
- **Test approach:** no fake ComfyUI HTTP server. Unit/HTTP tests: auth, sessions, admin, env, telemetry, comfy, manifest match rules, `pickMode`/`pickRecipe`, capabilities no-leak, DTO mappers, scheduler/limits/worker/hub, route ownership/admin/quota/cancel/SSE. Real GPU: `telemetry:demo`. Real engine: `comfy:smoke`, `queue:smoke`, `api:smoke` on the Spark (stop extra workers before queue smoke; `api:smoke` needs `dev:backend` up).
- **Next:** frontend create/library screens → Klein edit/reference recipes → LTX video recipes → uploads.

### 8.12 Telemetry (per-job metrics)

Self-contained module at `apps/studio/backend/src/telemetry/`. Callers pass plain data; it must not import ComfyUI, recipes, Express or queue code (only `type Logger` and `Clock` from `src/lib`). Public API: `createTelemetry({ store, sampler, logger, clock?, config? })` → `runStart` / `runEvent` / `runEnd` / `flush`. Fire-and-forget, never throws; `flush` waits for in-flight saves and stops the sampler. Disabled when `TELEMETRY_ENABLED=false` (no-op functions). `nodes_cached` events carry `{ nodeId, nodeClass, nodeTitle? }[]`. The queue worker and `comfy:smoke` forward comfy hooks into `runEvent`.

**One row per finished job** (`job_metrics`), fields:

| Area | Fields | Meaning |
|---|---|---|
| Identity | `jobId`, `userId`, `recipeId`, `tool` (`image`\|`video`) | Which job, who, which recipe |
| Outcome | `status`, `errorCode?` | `done` / `failed` / `cancelled` |
| Wall time | `queuedAt`, `startedAt`, `finishedAt`, `queueWaitMs`, `runMs` | Wait in queue vs actual run length |
| Output | `output?` (`width`, `height`, `frames`, `bytes`) | Result size when known |
| Nodes | `nodes[]` (`nodeId`, `class`, `title?`, `ms`, `cached`) | Per-step duration; cached steps are 0 ms (ComfyUI runs these graphs one node at a time) |
| Phases | `loadMs`, `sampleMs`, `decodeMs`, `otherMs` | Node times rolled into load / sample / decode / other (class regex table in `phases.ts`) |
| Warm | `warm` | `true` when every node whose class matches `/Loader/` was cached (vacuous if none). ComfyUI moves weights to the GPU lazily, so cold cost shows in encoder/sampler nodes, not loaders |
| Hardware | `samples`, GPU util/power/temp avg&peak, mem used/available/swap, `memTotalMb`, `gpuAvailable` | Summaries from ~1s samples (+ start/end); raw series not stored. GPU via long-lived `nvidia-smi`; memory via `/proc/meminfo` (Total−Available). Nulls when unavailable |
| Meta | `createdAt` | Insert time; TTL index uses retention days |

**Stores:** `MemoryMetricsStore` (tests/demo/smoke) · `MongoMetricsStore` (injected `Collection`; `ensureIndexes()` for unique `jobId`, `finishedAt`, `{recipeId,finishedAt}`, TTL on `createdAt` — called from `compose` at boot). **Demo:** `npm run telemetry:demo` → fake ~5s run, real `SystemSampler`, prints JSON + `warm` summary, then `process.exit(0)`.

### 8.13 Studio layout on disk (current)

```
apps/studio/
├── package.json · package-lock.json · .prettierrc.json
├── shared/                         (@studio/shared)
│   ├── package.json · tsconfig.json
│   └── src/
│       ├── index.ts · brand.ts · departments.ts · pick-mode.ts
│       └── schemas/   auth · admin · admin-studio · user · error · events
│                      capabilities · job · asset · thread · library · settings
├── backend/                        (@studio/backend)
│   ├── package.json · tsconfig.json · tsconfig.build.json
│   ├── eslint.config.mjs · vitest.config.ts · .env.example
│   ├── recipes/
│   │   └── image-create-fast/
│   │       ├── manifest.json
│   │       └── workflow.api.json
│   ├── scripts/
│   │   ├── seed-admin.ts
│   │   ├── telemetry-demo.ts
│   │   ├── comfy-smoke.ts
│   │   ├── queue-smoke.ts
│   │   └── api-smoke.ts
│   ├── src/
│   │   ├── server.ts · app.ts · compose.ts
│   │   ├── config/env.ts
│   │   ├── routes/        auth · admin · admin-studio · health · capabilities
│   │   │                  threads · generations · events · files · library
│   │   ├── controllers/   auth · admin-users · admin-studio · health
│   │   │                  capabilities · threads · generations · events
│   │   │                  files · library
│   │   ├── services/      auth · session · admin-users · admin-studio
│   │   │                  generation · generation-query · pick-recipe
│   │   │                  capabilities · thread · files · library
│   │   ├── mappers/       job · asset · thread · admin-run
│   │   ├── middleware/    session · require-auth · validate · security · origin-check
│   │   │                  rate-limits · request-logger · error-handler · not-found
│   │   │                  frontend-static
│   │   ├── db/            mongo.ts · indexes.ts · documents.ts
│   │   │   └── repositories/  user · session · thread · job · asset · usage-daily
│   │   │                      settings · audit · mongo-* counterparts
│   │   ├── lib/           logger · clock · errors · password · session-token
│   │   │                  public-user · escape-regex · cursor · title-from-prompt
│   │   ├── types/express.d.ts
│   │   ├── limits/        defaults · day-key · limits.service
│   │   ├── events/        hub.ts
│   │   ├── queue/         scheduler · stage · worker · run-job · cancel · recovery
│   │   │                  warm-up · retention · engine-state · positions · write-output
│   │   ├── telemetry/     (self-contained; wired from the worker)
│   │   │   ├── index.ts · create-telemetry.ts · types.ts · schema.ts
│   │   │   ├── config.ts · persist.ts · run-tracker.ts
│   │   │   ├── nodes.ts · phases.ts · aggregates.ts
│   │   │   ├── sampler/   types · system-sampler · default-spawn
│   │   │   │              nvidia-smi · meminfo
│   │   │   └── store/     types · memory-store · mongo-store
│   │   └── comfy/         (only code that talks to ComfyUI)
│   │       ├── index.ts · create-comfy.ts · types.ts · errors.ts
│   │       ├── http.ts · socket.ts · ws-messages.ts
│   │       ├── run-prompt.ts · run-prompt-handlers.ts
│   │       ├── resolve-node.ts · collect-output.ts
│   │       └── recipes/   manifest-schema · graph-schema · recipe
│   │                      load-recipes · patch-graph · match-validation
│   └── tests/
│       ├── auth · session · admin · password · env · origin-and-errors
│       ├── helpers/test-app.ts · test-studio-app.ts
│       ├── fakes/         memory-*-repository · fake-comfy · fake-comfy-client
│       ├── routes/        studio-api
│       ├── shared/        pick-mode
│       ├── mappers/       job
│       ├── telemetry/     …
│       ├── comfy/         … · match-validation
│       ├── queue/         scheduler · worker
│       ├── limits/        limits.service
│       ├── events/        hub
│       └── services/      pick-recipe · capabilities
└── frontend/                       (@studio/frontend)
    ├── package.json · tsconfig.json · next.config.ts · eslint.config.mjs
    ├── AGENTS.md · README.md
    ├── public/            (default Next placeholders)
    └── src/
        ├── app/
        │   ├── layout.tsx · providers.tsx · globals.css · not-found.tsx
        │   ├── (auth)/    login/page · register/page · layout
        │   └── (app)/     layout · page · admin/users/page
        ├── components/
        │   ├── layout/    app-shell · brand-mark · page-header · theme-toggle · user-menu
        │   └── ui/        button · input · field · card · badge · avatar · spinner
        │                  skeleton · toaster · dropdown-menu · confirm-dialog · password-input
        ├── features/
        │   ├── auth/      api · hooks · schemas · login-form · register-form
        │   │              register-success · auth-guard · require-admin
        │   └── admin/     api · hooks · users-page · users-table · user-card-list
        │                  user-actions · status-tabs
        ├── lib/           api-client · query-client · cn · format
        └── hooks/         (empty — planned)
```

## 9. Deployment and serving

- **Development:** Cursor Remote-SSH to the Spark over Tailscale. Code lives at `~/projects/company-ai` on the Spark. A private Git remote is the backup. Local run is still `npm run dev` (bot UI :3000 / API :4000; Studio UI :3001 / API :4001) against host-published Mongo/vLLM/ComfyUI (`127.0.0.1` only). Shared Mongo uses separate DB names (`seven_towers_bot`, `studio`). In Compose, backends also reach Mongo as hostname `mongo` on network `company-ai`.
- **Run:** Docker Compose on the Spark. Shared external networks: `company-ai` (create once: `docker network create company-ai`) and `studio-engine` (create once: `docker network create studio-engine`). `restart: unless-stopped`. Secrets stay in each app's `backend/.env` (never committed).
  - LLM: `infra/vllm/docker-compose.yml`. Host bind `127.0.0.1:8000` only. Apps reach it as `http://vllm:8000/v1`.
  - Image/video gen: `infra/comfyui/docker-compose.yml`. Host bind `127.0.0.1:8188` only. On networks `default` and `studio-engine`, not on `company-ai`. Models mounted read-only.
  - Bot app + shared Mongo: `apps/seven-towers-bot/docker-compose.yml`. Image from `apps/seven-towers-bot/Dockerfile` (frontend `out/` + backend `dist`, non-root, port 4000). Mongo is `mongo:7`, volume `mongo_data`, on networks `default` and `company-ai`, host bind `127.0.0.1:27017` only (for local `npm run` / seed). Databases: `seven_towers_bot` (bot) and `studio` (Studio) — same server, separate DBs. Compose overrides bot `MONGODB_URI` to host `mongo` and `LLM_BASE_URL` to `http://vllm:8000/v1`. App publish is `127.0.0.1:4000:4000`.
  - Studio app (planned): `apps/studio/docker-compose.yml`. **No Mongo service** — uses the shared `mongo` on `company-ai` with DB `studio` (`MONGODB_URI` host `mongo`). Studio is on `company-ai` and `studio-engine`, with `COMFY_URL=http://comfyui:8188`. Publish `127.0.0.1:4001:4001`. Generated files in a bind-mounted data directory.
  - Knowledge (bot): `backend/knowledge` is bind-mounted. Edit on the host, then admin **Reload knowledge** — no image rebuild.
  - First admin (empty DB only): `docker compose --env-file backend/.env exec -it <service> npm run seed:admin`. Skip when reusing an existing volume.
- **Access:** On the Spark, bot at `http://127.0.0.1:4000`, Studio at `http://127.0.0.1:4001`; app ports are localhost-only.
  - Bot (public proof of concept): Tailscale Funnel (`tailscale funnel --bg http://127.0.0.1:4000`) at `https://spark-beee.tail811701.ts.net/`. Cloudflare Tunnel with our own domain for production. The tunnel points only at the app port.
  - Studio (staff only): `tailscale serve --bg --https=8443 http://127.0.0.1:4001` plus a Tailscale ACL limiting access to approved staff devices. **Never Funnel.** After any change run `tailscale funnel status` and confirm port 8443 is not listed.
- **Same build, both ways:** relative URLs, cookie `Secure` set by protocol, no external assets.
- **To do:** nightly `mongodump` (both databases) and a backup of Studio data to another machine · UPS · wired Ethernet · fixed LAN IP.
- **Known risk:** the Spark is a single point of failure. Accepted at this scale.

## 10. Engineering practices

- **Layers:** routes (URL → controller) → controllers (HTTP only) → services (logic) → guardrails (judge input/output). One file, one job; aim for ≤150 lines. Studio adds `compose.ts` (composition root), `comfy/` (only code that speaks to ComfyUI), `queue/` (only code that picks and runs jobs), `limits/`, `events/`, and `telemetry/` (per-job metrics; no Comfy/Express imports).
- **Safety:** TypeScript `strict`, no `any`; Zod validation at every boundary (env, request bodies, recipe manifests, telemetry rows, SSE events). Studio shares schemas between backend and frontend through `@studio/shared`.
- **Readability:** explicit names; comments explain *why*; no clever abstractions. A junior should follow every line.
- **Config:** only through validated env; `.env.example` committed; secrets never in Git.
- **Errors and logs:** typed errors, one central handler, one JSON error shape; pino JSON logs with request ID; never log passwords. Never `console.log`.
- **Tests:** Vitest for guards, prompt builder, auth, recipe resolver, graph patching, quotas, scheduler, worker, hub and telemetry, with the LLM and ComfyUI behind injectable interfaces.
- **Style:** ESLint + Prettier; Conventional Commits (`feat:`, `fix:`, `chore:`); npm (not pnpm); npm workspaces inside `apps/studio`.
- **Versioned content:** system prompts, knowledge packs and ComfyUI recipes (workflow JSON + manifest) are files in Git, reviewed like code.
- **Evals first:** golden questions (including out-of-scope and attack questions) run on every model, prompt or data change. Benchmark TTFT, tokens/sec and p50/p95 latency before launch. For Studio, a timing table per recipe and preset (seconds and peak memory) sets the quotas.
- **AI-assisted coding:** Cursor writes code from reviewed prompts, guided by `.cursor/rules/company-ai.mdc`. Every AI-written file is read and understood before commit.
- **Reuse:** move code to `packages/` only when a second app needs it.

## 11. Decisions log

| Decision | Why |
|---|---|
| vLLM in Docker as the only LLM inference engine | Industry standard, OpenAI-compatible, handles concurrency; image gen is separate (ComfyUI) |
| Qwen3.6-35B-A3B-FP8 (provisional) | MoE with 3B active parameters is fast; FP8 ≈ 35 GB; official weights. Evals decide |
| Document in the prompt, no RAG (≤10 pages) | Simpler; prefix caching keeps it fast |
| Thinking off by default | Latency; enable only where evals show a gain |
| Own UI, not Open WebUI | Brand control, rich results; Open WebUI's license requires its branding to stay for >50 users. Keep Open WebUI as an internal playground |
| Rich images via `show_images` over a server-side catalog; tables as GFM markdown in answers | No hallucinated image URLs; chat UIs already render markdown tables well |
| Two files per project; table markers and image names are parsed from the knowledge base | One editable markdown source; markers keep pack validation strict |
| Open registration with pending approval (email, full name, phone required), roles `user` and `admin` | Captures buyer leads; chatbot access only after admin approval; disable still available. Contact details are unverified |
| Server sessions + argon2id | Instant revocation, no token in JavaScript |
| Local MongoDB, not Atlas | Offline support |
| Static export served by Express | One origin; no proxy buffering of streamed answers |
| No LangChain; small own agent loop | Understandable code |
| Unknown-question registry via terminal `report_gap` tool + `knowledge_gaps` collection | Surfaces missing KB facts for content owners without polluting chat history or the SSE stream |
| ComfyUI under `infra/comfyui`, always-on | Same place as other platform services; on-demand start/stop deferred |
| NVIDIA Spark playbook Dockerfile, ComfyUI pinned (now **v0.41.0**) | Keeps NGC-optimized PyTorch on GB10; pin avoids untested upstream drift; v0.41.0 runs Flux 3, Z-Image, LTX-2.5 and Wan 2.2 |
| Image weights in `~/comfyui` (not Git); 60g mem + memswap cap | Large assets stay on NVMe; 60g covers Klein with upsampler and LTX-2.5; equal memswap blocks swap spill |
| FLUX 3 Image Klein + Z-Image-Turbo for images; only distilled BF16 Klein graphs kept | Z-Image for speed, Klein for quality, edit and multi-reference; base and int8 variants are slower or not downloaded |
| Staff do not use the ComfyUI UI; a custom app (`studio`) drives ComfyUI through its API | Accounts, quotas, one shared queue, fixed presets, no model downloads, no hidden-model leaks. ComfyUI has no real auth or per-user control |
| Video model: LTX-2.5 distilled only; Wan 2.2 parked | LTX is fast, one model covers text, image and first/last frame, and makes audio. Wan 14B was too slow. License for LTX cleared |
| ComfyUI isolated on Docker network `studio-engine`, host bind `127.0.0.1`, models mount read-only, `--disable-api-nodes`, `--disable-metadata` | Only the Studio backend can reach it; nobody can add models or use cloud nodes; outputs carry no model names |
| Studio queue in MongoDB with one worker loop, no Redis/BullMQ | Scale is small; ComfyUI's own queue has no users, quotas or priorities, so ours must be the control point |
| Workflows are API-format JSON per recipe; nodes found by title, not id | Survives re-exports and renumbering; boot-time check catches drift |
| One pipeline for create and edit: recipe resolver chooses by attached images, shown to the user as an explicit "working image" chip | Users never pick a workflow; deterministic, no LLM router latency or error |
| Studio is its own app with its own database, auth and port 4001 | No risk to the live bot; extract shared auth later |
| `apps/studio` uses npm workspaces with `@studio/shared` (Zod schemas) | Request and response shapes are written once and checked on both sides |
| Studio served tailnet-only (`tailscale serve`), never Funnel | Staff tool; no public exposure |
| Studio accounts: free signup with admin approval, no SSO | Matches the bot's model; no internet dependency |

## 12. Open items

- Abuse control for open signup on the bot: CAPTCHA services need internet, so start with per-IP limits, honeypot, pending approval and admin disable; consider WhatsApp/SMS verification later.
- Password reset for public users (admin-assisted for now; email or WhatsApp reset when online).
- Wording of the signup privacy notice (chats are stored and visible to staff) — same for Studio (generations visible to admins).
- Seven Towers real `system.md` / `knowledge.md` content (images and tables).
- Golden question set (including known / unknown / partial / off-topic / injection cases for `report_gap`) once an eval runner exists under `evals/`.
- Domain name for Cloudflare Tunnel.
- Backup target for MongoDB (bot and Studio) and Studio files.
- Final model choice via evals.
- Studio: HTTP routes for generations / SSE (`GET /events`) / files / library / capabilities; wire controllers to `GenerationService`, hub and cancel.
- Studio: frontend create/library screens consuming shared `studioEventSchema`.
- Studio: move local `pickRecipe` into `@studio/shared` as `pickMode` (part 2).
- Studio: timing table for LTX-2.5 text-to-video (resolutions × durations: seconds and peak memory) to set quotas and presets.
- Studio: export API-format graphs with titled nodes for Klein text-to-image, edit, multi-reference and for the three LTX video modes; confirm size handling for edits.
- Studio: product name, department list for signup; revisit daily budgets after the timing matrix.
- Studio: attribution wording required by the Klein and LTX licenses when model names are hidden.
- Studio: scheduler improvement to group queued jobs by model family; measure bot slowdown during video jobs and decide when to pause video during bot busy hours.
- Studio: upscaling recipes (image and video) need extra custom nodes and an engine image rebuild.
- Cleanup: delete the unused base and int8 Flux workflow JSONs from `infra/comfyui/workflows/`; delete parked Wan 2.2 weights when disk space is needed.    
