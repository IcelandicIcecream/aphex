# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS builder

# Use the pnpm version pinned by `packageManager` in package.json (or fall
# back to a recent one). corepack ships with Node 20+.
RUN corepack enable

WORKDIR /app

# Install dependencies first so this layer caches across source-only edits.
COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
		pnpm install --frozen-lockfile; \
	else \
		pnpm install; \
	fi

# Copy the rest of the source.
COPY . .

# Build the SvelteKit app. ADAPTER=node selects @sveltejs/adapter-node so
# the build emits `build/index.js` runnable with `node build`. Server
# modules are guarded with `building` so the analyse pass doesn't require
# DATABASE_URL/AUTH_SECRET/etc. — pass real values at runtime instead.
RUN ADAPTER=node pnpm build

# Drop devDependencies so the runtime image is leaner.
RUN pnpm prune --prod


# ---- Runtime stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Build output, prod-only deps, and drizzle migration files.
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

# Pass real env at runtime, e.g.:
#   docker run -e DATABASE_URL=... -e AUTH_SECRET=... -e AUTH_URL=... ...
CMD ["node", "build"]
