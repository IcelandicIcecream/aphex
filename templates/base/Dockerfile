# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS builder

# Use the pnpm version pinned by `packageManager` in package.json (or fall
# back to a recent one). corepack ships with Node 20+.
RUN corepack enable

WORKDIR /app

# Copy config files needed by install (prepare script runs svelte-kit sync).
COPY package.json pnpm-lock.yaml* svelte.config.js vite.config.ts tsconfig.json ./

RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile; \
    else \
        pnpm install; \
    fi

COPY . .

# Build the SvelteKit app. ADAPTER=node selects @sveltejs/adapter-node so
# the build emits `build/index.js` runnable with `node build`. Server
# modules are guarded with `building` so the analyze pass doesn't require
# DATABASE_URL/AUTH_SECRET/etc. — pass real values at runtime instead.
RUN ADAPTER=node pnpm build

# Drop devDependencies so the runtime image is leaner.
RUN pnpm prune --prod


# ---- Runtime stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Build output, prod-only deps, and drizzle migration files.
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

# Apply pending DB migrations on start, then serve. `aphex migrate` is runtime-safe
# (uses drizzle-orm, not the pruned drizzle-kit); invoking it via `node <bin>` runs the
# compiled CLI directly, so no tsx/PATH setup is needed. Idempotent — already-applied
# migrations are skipped. For multi-instance deploys, run `aphex migrate` once as a
# pre-deploy step instead and revert this to `node build` to avoid concurrent migration.
CMD ["sh", "-c", "node node_modules/.bin/aphex migrate && node build"]
