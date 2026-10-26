# Production image for seven-towers-bot.
# Built on the Spark (linux/arm64). Native addons (argon2) compile in the
# backend-build stage; the runner has no compilers.

FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# next.config.ts only enables `output: "export"` when NODE_ENV !== development.
# `next build` sets production itself; this makes the intent obvious.
ENV NODE_ENV=production
RUN npm run build

FROM node:22-slim AS backend-build
# python3 / make / g++: argon2's native binding. Not copied to the runner.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build \
  && npx tsc -p tsconfig.seed.json \
  && npm prune --omit=dev

FROM node:22-slim AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=backend-build --chown=node:node /app/backend/package.json ./package.json
COPY --from=backend-build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/backend/dist ./dist
COPY --from=backend-build --chown=node:node /app/backend/dist-seed ./dist-seed
COPY --from=backend-build --chown=node:node /app/backend/knowledge ./knowledge
COPY --from=backend-build --chown=node:node /app/backend/prompts ./prompts
COPY --from=frontend-build --chown=node:node /app/frontend/out /app/frontend/out

# Local `npm run seed:admin` uses tsx. The runner has compiled JS only.
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); p.scripts['seed:admin']='node dist-seed/scripts/seed-admin.js'; fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');" \
  && chown node:node package.json

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
