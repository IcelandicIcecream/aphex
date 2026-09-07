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

# `prune --prod` is not enough on its own. The build toolchain is reachable from
# *production* dependencies as peers — `bits-ui` and `better-auth` both peer-depend on
# @sveltejs/kit, which peer-depends on vite (and so rolldown) and typescript — so pnpm
# keeps all of it, correctly, by its own rules. The compiler and two copies of a Rust
# bundler are ~56MB that nothing can reach once the app is built.
#
# The list below is deliberately narrow, and it is worth understanding why before adding
# to it. `@aphexcms/cms-core` stays *external* to the server bundle, so its own imports
# resolve from node_modules at boot — and it imports `@sveltejs/kit` (for `redirect`,
# `json`, `error`). Deleting Kit gets you a container that builds, starts, prints the
# banner, and then dies with ERR_MODULE_NOT_FOUND from `dist/auth/auth-hooks.js`. Kit
# stays. Only genuine build-time-only packages go here.
#
# `@lucide/svelte` (~29MB of icons) goes for a different reason, and the reason
# generalises: Node cannot import a `.svelte` file, so a Svelte component package can
# never be externalised — Vite has to bundle it, and it does, tree-shaken down to the
# handful of icons actually used. The copy in node_modules is therefore unreachable by
# construction. That test — "does this package ship components, or JS the server
# imports?" — is the one to apply before adding anything else here.
#
# Sharp is the other half. It publishes one prebuilt libvips per platform *and* per libc,
# and the install brings both glibc and musl variants. This is Alpine, so only musl is
# ever loaded — note the trailing dash in the glob, which is what distinguishes
# `sharp-libvips-linux-arm64` (glibc, unused) from `sharp-libvips-linuxmusl-arm64` (kept).
#
# Everything loaded at runtime must stay: @sveltejs/kit, drizzle-kit (the SQLite adapter
# pushes its schema at boot), @libsql/client, postgres, and sharp itself. If you add a
# dependency that is resolved at runtime rather than bundled, keep it out of this list —
# and if you change the list, boot the image and hit a page, not just /healthz.
RUN cd node_modules/.pnpm && rm -rf \
        typescript@* \
        vite@* \
        rolldown@* \
        @rolldown+binding-* \
        @sveltejs+vite-plugin-svelte@* \
        @sveltejs+adapter-* \
        @img+sharp-libvips-linux-* \
        @img+sharp-linux-* \
        @lucide+svelte@* \
    || true


# ---- Runtime stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# su-exec lets the entrypoint fix volume ownership as root and then hand the server
# process to an unprivileged user — the app itself never runs as root. See the
# entrypoint for why both halves are needed. node:alpine already provides the `node`
# user (uid 1000), so there is nothing to create.
RUN apk add --no-cache su-exec

# Build output, prod-only deps, and drizzle migration files.
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

# Report readiness to whatever is running the container. `docker run`, compose, Coolify
# and Dokploy all read this; the managed platforms use their own probe config instead
# (render.yaml / railway.json point at the same path).
#
# node rather than curl, because neither curl nor wget-with-https is in node:alpine, and
# `fetch` is built in from Node 18. PORT is read at check time so it follows the platform
# rather than hardcoding 3000 twice. The start period covers first boot, which provisions
# the schema and seeds example content and so takes longer than a restart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The entrypoint works out the public URL from whatever the platform exposes,
# applies migrations when running on Postgres, and execs the server. See the
# comments in the script — most of it exists to stop a first deploy coming up
# reachable but impossible to log into.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
