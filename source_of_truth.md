# company-ai — Source of Truth

> What exists, where it lives, and how we work. Update this file in the same commit as any architectural change.
> Last updated: 2026-10-28

## 1. What this is

On-premise AI assistants and creative tools for the company, powered by one self-hosted LLM and one self-hosted image/video engine on an NVIDIA DGX Spark (Linux, ARM64, 128 GB memory shared by CPU and GPU).

| # | App | Purpose | Status |
|---|---|---|---|
| 1 | `seven-towers-bot` | Q&A on the Seven Towers project from ≤10 pages of company data, for the public (prospective buyers). Proof of concept | In development |
| 2 | `hub-bot` | Bosses-only assistant over the cloud CRM / EMS / HR / CMS via tool calling | Planned |
| 3 | `social-bot` | Replies to WhatsApp / social comments / app reviews, human approval for decisions | Planned |
| 4 | `studio` | Staff-only image and video generation app (accounts, job queue, fixed presets) on top of ComfyUI | Scaffolded; text-to-image first |

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
│   └── studio/             npm workspaces: shared · backend · frontend
│       ├── shared/         Zod schemas + types used by both sides (@studio/shared, built to dist/)
│       ├── backend/
│       │   ├── src/        config · routes · controllers · services · comfy · queue · db · middleware · lib
│       │   ├── recipes/<id>/   manifest.json · workflow.api.json   (one folder per recipe)
│       │   ├── tests/
│       │   └── .env.example
│       └── frontend/       Next.js App Router (static export → out/)
│           └── src/        app · components/{ui,layout,tool-form,results} · features/{auth,create,library,admin} · hooks · lib
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

1. The browser sends `POST /api/threads/:id/generations` with prompt, presets and any input image ids.
2. The controller validates the body with the shared Zod schema and checks quotas (section 8.5).
3. The **recipe resolver** picks the recipe from the inputs (section 8.3). The user never chooses a workflow.
4. A `jobs` document is saved as `queued` and the API answers immediately with the job id.
5. A single worker loop in the backend takes the next eligible job when ComfyUI is idle.
6. The ComfyUI client copies the recipe's workflow JSON in memory, sets the allowed values by node title, sets a **fresh random seed** and a unique `filename_prefix`, uploads input images if needed, then calls `POST /prompt`.
7. One persistent WebSocket to ComfyUI delivers progress events. The backend forwards them to the owner over SSE.
8. On completion the backend fetches the output from `/view`, writes it to `DATA_DIR/<userId>/`, makes a WebP thumbnail, saves `assets`, marks the job `done` and sends `done` over SSE.
9. The thread shows the result.

Why it stays fast: patching an in-memory graph takes milliseconds against seconds of GPU time; one persistent WebSocket instead of polling; model warm-up at boot; no extra hop through the LLM.

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

- One folder per recipe in `backend/recipes/<id>/`: `workflow.api.json` (the "Export (API)" file from ComfyUI) and `manifest.json` (id, output type, allowed parameters with enums/ranges, defaults, which node title and input field each parameter writes to, locked quality-vs-time notes).
- **Nodes are found by title, never by id.** Title convention: `IN_PROMPT`, `IN_SIZE`, `IN_SAMPLER`, `IN_IMAGE_1…4`, `OUT_IMAGE`, `OUT_VIDEO`. At boot the backend checks every title in every manifest exists exactly once and refuses to start otherwise.
- Everything not in the manifest stays locked in the file (steps, cfg, sampler, models).
- `image-create-fast` (Z-Image-Turbo), as exported:

| Title | Class | Backend writes |
|---|---|---|
| `IN_PROMPT` | CLIPTextEncode | `text` |
| `IN_SIZE` | EmptySD3LatentImage | `width`, `height`, `batch_size` |
| `IN_SAMPLER` | KSampler | `seed` (fresh per job). Locked: steps 8, cfg 1, `res_multistep`, `simple` |
| `OUT_IMAGE` | SaveImage | `filename_prefix` = `studio/<jobId>` |

- ComfyUI endpoints used: `POST /prompt` · WebSocket `/ws` · `GET /history/{id}` · `GET /view` · `POST /upload/image` · `POST /interrupt` · `GET /queue` and `POST /queue` (delete) · `GET /system_stats`.
- Unlike the original idea of exposing templates, no user-built workflows exist. Adding a capability = authoring a graph in ComfyUI (admin), exporting API format, titling nodes, writing a manifest. If a graph needs a custom node, the engine image is rebuilt (custom nodes are not user-installable).
- Failures from ComfyUI become generic user-facing codes; full detail goes only to logs.

### 8.5 Queue, limits and recovery

- **Queue:** MongoDB `jobs` is the queue; one worker loop; Studio hands ComfyUI exactly one job at a time, so ComfyUI's own queue stays empty and cancel, priority and fairness are ours. Order: round-robin across users, oldest first, images before videos.
- **Limits (defaults, configurable, set after the timing matrix):** per user 1 running + 3 queued · global queued cap · daily job count and daily GPU-seconds budget per user · prompt ≤1,000 characters · count ≤4 · reference images ≤4 · upload size cap · sizes, durations and fps only from fixed presets · per-job timeout watchdog that calls `/interrupt` · admin **pause** switch (engine paused → jobs wait, UI shows "paused").
- **Recovery:** on boot, `running` jobs are reconciled with ComfyUI `/queue` and `/history` (finished → collect output; vanished → requeue once, then fail). If ComfyUI is unreachable, jobs stay queued and the UI shows "Engine unavailable". Studio and ComfyUI are separate containers and restart independently.
- **Warm-up:** at boot and after any ComfyUI restart, one tiny throwaway generation loads the default model so the first user does not pay the load.
- **Fresh seed per job:** ComfyUI skips work it has already cached for identical inputs; a reused seed makes "Regenerate" return instantly and look broken.

### 8.6 Data model (MongoDB, database `studio`)

- `users`: email, fullName, passwordHash, role `user` | `admin`, status `pending` | `active` | `disabled`, department, note, createdAt.
- `sessions`: server-side sessions (httpOnly cookie).
- `threads`: userId, title (from the first prompt), createdAt, updatedAt.
- `jobs`: userId, threadId, recipeId, status `queued` | `running` | `done` | `failed` | `cancelled`, params (validated, user-facing only), inputAssetIds, outputAssetIds, parentAssetId, comfyPromptId, errorCode, timings (queuedAt, startedAt, finishedAt).
- `assets`: userId, kind `image` | `video`, file path, thumb path, width/height/duration, source `upload` | `generated`, createdAt, deletedAt.
- `usage_daily`: userId, day, jobs, gpuSeconds.
- `audit_logs`: admin actions, including every admin view of another user's generations.
- `settings`: single document (engine paused, limits overrides).

### 8.7 API surface (`/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /me` |
| Capabilities | `GET /capabilities` (offered presets, limits, remaining quota) |
| Threads | `POST /threads` · `GET /threads` · `GET /threads/:id` · `DELETE /threads/:id` |
| Generate | `POST /threads/:id/generations` · `GET /generations/:id` · `DELETE /generations/:id` (cancel queued/running) |
| Uploads | `POST /uploads` (images; validated and re-encoded) |
| Live | `GET /events` (SSE, one stream per user: queued, position, progress, done, failed) |
| Files | `GET /files/:assetId` (`?thumb=1`) — owner or admin only |
| Library | `GET /library` (paginated, filter by kind) |
| Admin | `GET/PATCH /admin/users` · `GET /admin/jobs` · `GET/PATCH /admin/engine` (pause) · `GET /admin/stats` |

### 8.8 Accounts

Account creation is free but needs admin approval. Signup fields: full name, email, password, department, optional note. New accounts are `pending` and cannot sign in until an admin sets `active`; the login screen says so plainly. First admin: `npm run seed:admin`, never through signup. Sessions: server-side, httpOnly cookie `studio_sid`, argon2id. No email dependency: password resets are admin-assisted. No Google or SSO login (needs the internet). Limits: per-IP signup rate limit, honeypot field, login rate limit. The signup screen states that generations are stored and visible to admins. Auth code is written inside Studio for now; extract to `packages/auth` once Studio is stable and a second app needs it.

### 8.9 Hiding the engine

- The API and UI use only product wording ("Fast", "Best quality", "Edit"). No model names, node names or workflow names ever leave the backend.
- ComfyUI errors are replaced by generic codes for users and logged in full for the admin.
- Output files carry no embedded workflow (`--disable-metadata`); files are re-encoded on download if needed.
- Check each model license's attribution wording before dropping credit everywhere (Klein and LTX terms).

### 8.10 UI

- Screens: Login · Request account (with a pending-approval state) · Home (greeting, composer, recent) · Create image (thread) · Create video (thread) · My Generations (All / Images / Videos; download, delete) · Admin (Dashboard, Users and approvals, Jobs, Engine pause, Settings) · mobile tab bar (Home, History, Profile).
- The mockup's separate per-tool pages collapse into the two thread composers above. Removed from the mockup: the model dropdown and "Model" field, Google/SSO login, the Audio to Audio tile (until a recipe exists), "approval email" copy.
- Stack: Next.js static export (`output: 'export'`, `trailingSlash`, one `/create/` page reading `?tool=` because static export cannot pre-build dynamic tool routes) · Tailwind v4 · Radix (`radix-ui`) · Motion · lucide · TanStack Query · react-hook-form + Zod · `next-themes` (light/dark/system, no flash) · `sonner` toasts · self-hosted Inter Variable. No external assets; strict CSP.

### 8.11 Run and status

- **Workspaces:** `apps/studio` root `npm install` links `shared`, `backend`, `frontend`. Scripts: `npm run dev:backend` (API :4001) · `npm run dev:frontend` (UI :3001) · `npm run typecheck | lint | test` · `npm run build -w @studio/shared` before building the others.
- **Backend env (`.env.example`):** `NODE_ENV`, `PORT=4001`, `LOG_LEVEL`, `MONGODB_URI`, `COMFY_URL` (`http://127.0.0.1:8188` in dev, `http://comfyui:8188` in compose), `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `DATA_DIR`. All validated with Zod at boot.
- **Storage:** results under `DATA_DIR/<userId>/`, served only to the owner (and admins, audited). Retention 30 days by default.
- **Status (2026-10-28):** ComfyUI isolation done and verified; workspace scaffold, dependencies and empty folder structure created; Z-Image workflow exported in API format. No Studio application code yet.
- **Test approach:** no fake ComfyUI server for now. Unit tests cover the recipe resolver, graph patching, quotas and queue ordering behind a small client interface. Real behavior is checked with a `smoke` script against the real engine.
- **Next:** backend ComfyUI client and `image-create-fast` end to end → queue and SSE → auth and approvals → frontend design system and screens → Klein edit/reference recipes → LTX video recipes.

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

- **Layers:** routes (URL → controller) → controllers (HTTP only) → services (logic) → guardrails (judge input/output). One file, one job; aim for ≤150 lines. Studio adds `comfy/` (the only code that speaks to ComfyUI) and `queue/` (the only code that picks and runs jobs).
- **Safety:** TypeScript `strict`, no `any`; Zod validation at every boundary (env, request bodies, recipe manifests). Studio shares schemas between backend and frontend through `@studio/shared`.
- **Readability:** explicit names; comments explain *why*; no clever abstractions. A junior should follow every line.
- **Config:** only through validated env; `.env.example` committed; secrets never in Git.
- **Errors and logs:** typed errors, one central handler, one JSON error shape; pino JSON logs with request ID; never log passwords.
- **Tests:** Vitest for guards, prompt builder, auth, recipe resolver, graph patching and quotas, with the LLM and ComfyUI behind injectable interfaces.
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
- Studio: timing table for LTX-2.5 text-to-video (resolutions × durations: seconds and peak memory) to set quotas and presets.
- Studio: export API-format graphs with titled nodes for Klein text-to-image, edit, multi-reference and for the three LTX video modes; confirm size handling for edits.
- Studio: product name, department list for signup, retention period, daily budgets.
- Studio: attribution wording required by the Klein and LTX licenses when model names are hidden.
- Studio: scheduler improvement to group queued jobs by model family; measure bot slowdown during video jobs and decide when to pause video during bot busy hours.
- Studio: upscaling recipes (image and video) need extra custom nodes and an engine image rebuild.
- Cleanup: delete the unused base and int8 Flux workflow JSONs from `infra/comfyui/workflows/`; delete parked Wan 2.2 weights when disk space is needed.    
