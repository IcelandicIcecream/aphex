#!/bin/sh
#
# Container entrypoint: work out the app's public URL, apply migrations, serve.
#
# The URL is the whole reason this file exists. adapter-node has no idea what
# hostname it is being served on — it builds `event.url` from its own internal
# host:port unless ORIGIN says otherwise. Better Auth then compares that origin
# against AUTH_URL and, on a mismatch, declines the request; the decline lands on
# the API catch-all as a bare 404, so sign-up fails with nothing in the log that
# names the cause. It is the single most common way a first deploy "works" but
# can't be logged into.
#
# On a one-click deploy you cannot set AUTH_URL in advance, because the platform
# invents the hostname during provisioning. So each platform's own variable is
# read here instead, and an explicit AUTH_URL always wins — set one as soon as you
# put a custom domain in front of this, since every link in an outgoing email is
# built from it.

set -e

# ── Public URL ───────────────────────────────────────────────────────────────
if [ -z "$AUTH_URL" ] && [ -z "$BETTER_AUTH_URL" ]; then
	if [ -n "$RENDER_EXTERNAL_URL" ]; then
		# Render — already absolute, scheme included.
		AUTH_URL="$RENDER_EXTERNAL_URL"
	elif [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
		# Railway — bare hostname; Railway terminates TLS in front of the container.
		AUTH_URL="https://$RAILWAY_PUBLIC_DOMAIN"
	elif [ -n "$APP_URL" ]; then
		# DigitalOcean App Platform.
		AUTH_URL="$APP_URL"
	elif [ -n "$COOLIFY_URL" ]; then
		# Coolify — comma-separated when several FQDNs point here; take the first.
		AUTH_URL="${COOLIFY_URL%%,*}"
	elif [ -n "$FLY_APP_NAME" ]; then
		AUTH_URL="https://$FLY_APP_NAME.fly.dev"
	fi

	if [ -n "$AUTH_URL" ]; then
		export AUTH_URL
		echo "[aphex] AUTH_URL not set — derived $AUTH_URL from the platform environment."
	fi
fi

# ORIGIN is what adapter-node actually reads. Derive it from whichever URL we ended
# up with, unless it was set explicitly.
if [ -z "$ORIGIN" ]; then
	if [ -n "$AUTH_URL" ]; then
		export ORIGIN="$AUTH_URL"
	elif [ -n "$BETTER_AUTH_URL" ]; then
		export ORIGIN="$BETTER_AUTH_URL"
	fi
fi

if [ -z "$ORIGIN" ]; then
	echo "[aphex] WARNING: neither AUTH_URL nor ORIGIN is set, and no platform URL was"
	echo "[aphex]          found. Sign-in will fail with a 404 from the auth routes."
	echo "[aphex]          Set AUTH_URL to this app's public origin, e.g."
	echo "[aphex]          AUTH_URL=https://cms.example.com"
fi

# ── Required secrets ─────────────────────────────────────────────────────────
# Refuse to boot rather than come up reachable with unsigned sessions. Every
# bundled deploy config generates this value, so hitting this means a hand-rolled
# `docker run` left it out.
if [ -z "$AUTH_SECRET" ] && [ -z "$BETTER_AUTH_SECRET" ]; then
	echo "[aphex] AUTH_SECRET is not set. It signs session cookies and API keys, so the app"
	echo "[aphex] will not start without one. Generate a stable value once and keep it —"
	echo "[aphex] rotating it signs everyone out and invalidates every API key:"
	echo "[aphex]"
	echo "[aphex]     openssl rand -base64 48"
	echo "[aphex]"
	exit 1
fi

# ── Migrate, then serve ──────────────────────────────────────────────────────
# Only Postgres gets a migration step, because only Postgres has one: drizzle/
# holds the PostgreSQL migration history, and the SQLite adapter provisions its
# own schema at startup with a push instead (there is no SQLite migration folder
# to apply). Running `aphex migrate` on the SQLite path doesn't no-op — it can't
# see APHEX_SQLITE_URL, finds no DATABASE_URL either, and exits with "No database
# configured", which crash-loops the container before the app is ever reached.
#
# `aphex migrate` is runtime-safe (drizzle-orm, not the pruned drizzle-kit) and
# idempotent — already-applied migrations are skipped. Running several replicas?
# Apply migrations as a pre-deploy step instead and set APHEX_SKIP_MIGRATE=true
# here, so N containers don't race each other through the same DDL on rollout.
#
# The compiled entry is called directly rather than node_modules/.bin/aphex: that
# shim execs `tsx`, which `pnpm prune --prod` removed from this image.
case "$(echo "$APHEX_DATABASE" | tr '[:upper:]' '[:lower:]')" in
	postgres | postgresql)
		if [ "$APHEX_SKIP_MIGRATE" = "true" ]; then
			echo "[aphex] APHEX_SKIP_MIGRATE=true — skipping migrations."
		else
			node node_modules/@aphexcms/cms-core/dist/cli/index.js migrate
		fi
		;;
	*)
		echo "[aphex] SQLite — schema is provisioned at startup, no migration step."
		;;
esac

# ── Drop privileges ──────────────────────────────────────────────────────────
# The server should not run as root, and on Kubernetes it often may not: the
# `restricted` Pod Security Standard requires runAsNonRoot, which rejects a root
# image outright rather than merely warning about it.
#
# A plain `USER node` in the Dockerfile does not work here, though, because every
# platform in the deploy guides mounts its volume owned by root. A non-root process
# then fails on first boot with EACCES creating the SQLite file or the uploads
# directory — which is the failure Railway papers over with RAILWAY_RUN_UID=0,
# handing root back and losing the point.
#
# So: if we start as root, fix ownership of the paths we are about to write and then
# hand off to the unprivileged `node` user. If we were already started as non-root
# (Kubernetes runAsNonRoot, or `docker run --user`), there is nothing to fix and
# nothing to drop — the volume's ownership is then the orchestrator's job, via
# fsGroup or an init container.
if [ "$(id -u)" = "0" ]; then
	# Only the paths that are actually written to. `chown` is not recursive by
	# default here: a media library of any size makes recursive chown a slow,
	# pointless boot cost, and files already written by this same user are fine.
	# The -R pass is limited to a directory we just created.
	for dir in "$APHEX_UPLOADS_DIR" "$(dirname "${APHEX_SQLITE_URL#file:}")"; do
		[ -n "$dir" ] || continue
		case "$dir" in .|/) continue ;; esac
		if [ ! -d "$dir" ]; then
			mkdir -p "$dir" && chown -R node:node "$dir"
		else
			chown node:node "$dir" 2>/dev/null || true
		fi
	done

	# exec so node becomes PID 1 and receives SIGTERM directly — without it the shell
	# holds PID 1, swallows the signal, and every deploy waits out the platform's kill
	# timeout before the container dies.
	exec su-exec node node build
fi

exec node build
