#!/usr/bin/env bash
#
# sync-template.sh — Sync apps/studio → templates/<name>
#
# Template-driven: walks every tracked file in the target template and copies
# the matching file from apps/studio if it exists. Files that only live in the
# template (Dockerfile, README.md, prod.docker-compose.yml, etc.) are left
# alone. Files that only live in studio (tests, seed routes, etc.) are never
# copied — so studio-only drift can't leak into the template.
#
# Both templates exclude src/lib/schemaTypes/: studio's schema dir is a dev
# fixture playground (movie, league, catalog, ...), so each template keeps its
# own curated schemas — base a minimal example, blog the blog content model.
#
# Usage:
#   ./scripts/sync-template.sh                  # preview base (dry run)
#   ./scripts/sync-template.sh --apply          # write base
#   ./scripts/sync-template.sh blog             # preview blog
#   ./scripts/sync-template.sh blog --apply     # write blog

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="$REPO_ROOT/apps/studio"

# Args are order-insensitive: a bare word names the template, --apply writes.
NAME="base"
APPLY=0
for arg in "$@"; do
	case "$arg" in
		--apply) APPLY=1 ;;
		base|blog) NAME="$arg" ;;
		*)
			echo "usage: $0 [base|blog] [--apply]" >&2
			exit 2
			;;
	esac
done

TEMPLATE="$REPO_ROOT/templates/$NAME"

if [[ ! -d "$STUDIO" || ! -d "$TEMPLATE" ]]; then
	echo "error: expected $STUDIO and $TEMPLATE to exist" >&2
	exit 1
fi

echo "syncing apps/studio → templates/$NAME"
echo

# Paths under the template to never touch.
should_skip() {
	local rel="$1"

	# Shared across every template.
	case "$rel" in
		# studio's schemaTypes/ is a dev fixture playground — each template
		# curates its own content model.
		src/lib/schemaTypes/*) return 0 ;;
		# Derived from each template's own schemas via `pnpm generate:types`.
		# Copying studio's describes studio's content model, which silently
		# masks a template whose schemas don't match its front-end.
		src/lib/generated-types.ts) return 0 ;;
		# Drizzle migrations are template-owned. The template ships ONE squashed
		# initial migration (regenerated via `pnpm db:generate`), not studio's
		# incremental 0000→N history — copying studio's journal/SQL desyncs the
		# journal from the template's single .sql and breaks a fresh `db:migrate`.
		drizzle/*) return 0 ;;
		drizzle/meta/*) return 0 ;;
		# Template uses node_modules/@aphexcms/*/dist paths for @source,
		# studio uses monorepo-relative packages/*/src paths — don't clobber.
		src/app.css) return 0 ;;
		# Deploy artefacts: tailored to the standalone scaffolded layout
		# (single-package, no monorepo paths), so don't let a future studio
		# Dockerfile/Procfile silently clobber them.
		Dockerfile) return 0 ;;
		Procfile) return 0 ;;
	esac

	# The blog template runs on SQLite (libsql) by default — zero-infra, no Docker.
	# Studio is Postgres-by-default and keeps all three drivers behind APHEX_DATABASE
	# so it can exercise every adapter. That makes the whole persistence seam
	# template-owned: syncing studio's copy silently reverts the blog to Postgres
	# (and drags pg/pglite deps + a Postgres compose service back with it).
	# Base keeps its own minimal content model (a single `page` type), so anything
	# that names studio's document types is template-owned — the same reason
	# schemaTypes/ is skipped. Blog is NOT skipped here: it shares studio's content
	# model, so its plugins.ts and seed stay in lockstep with studio's on purpose.
	if [[ "$NAME" == "base" ]]; then
		case "$rel" in
			# Studio's registry configures seoPlugin over blog_post/author/tag.
			src/lib/plugins.ts) return 0 ;;
			# Studio's seed writes blog documents; base seeds its own example page.
			src/lib/server/seed/*) return 0 ;;
			# Both lean on studio's content model: the layout resolves the
			# siteSettings singleton (favicon), the page wires the embed block's
			# editor preview. Base has neither type, so its copies diverge.
			"src/routes/(protected)/admin/+layout.server.ts") return 0 ;;
			"src/routes/(protected)/admin/+page.svelte") return 0 ;;
		esac
	fi

	if [[ "$NAME" == "blog" ]]; then
		case "$rel" in
			src/lib/server/db/*) return 0 ;;
			# Both auth instance files are bound to the dialect: better-auth/instance.ts
			# types its drizzle handle (LibSQLDatabase vs PostgresJsDatabase) and pins the
			# provider, and auth/instance.ts wires that up. Studio's copies assume pg.
			src/lib/server/auth/better-auth/instance.ts) return 0 ;;
			src/lib/server/auth/instance.ts) return 0 ;;
			drizzle.config.ts) return 0 ;;
			drizzle/*) return 0 ;;
			docker-compose.yml) return 0 ;;
			.env.example) return 0 ;;
			# Dependency lists diverge with the dialect (libsql vs postgres/pglite).
			package.json) return 0 ;;
		esac
	fi

	return 1
}

copied=0
skipped=0
unchanged=0
template_only=0

while IFS= read -r -d '' tmpl_file; do
	rel="${tmpl_file#"$TEMPLATE/"}"

	if should_skip "$rel"; then
		skipped=$((skipped + 1))
		continue
	fi

	studio_file="$STUDIO/$rel"
	if [[ ! -f "$studio_file" ]]; then
		template_only=$((template_only + 1))
		continue
	fi

	# package.json is merged: take studio's content but preserve the
	# template's own `name` and `version`. For base, also drop deps that only
	# serve studio's blog content model (same editorial call as its skip list):
	# the plugins its empty registry doesn't load, and shiki (used only by the
	# blog render components base doesn't ship).
	if [[ "$rel" == "package.json" ]]; then
		merged="$(node -e '
			const fs = require("fs");
			const studio = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
			const tmpl = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
			const out = { ...studio, name: tmpl.name, version: tmpl.version };
			if (process.argv[3] === "base") {
				for (const dep of [
					"@aphexcms/plugin-seo",
					"@aphexcms/plugin-color-picker",
					"@shikijs/core",
					"@shikijs/engine-javascript",
					"@shikijs/langs",
					"@shikijs/themes"
				]) {
					delete out.dependencies?.[dep];
					delete out.devDependencies?.[dep];
				}
			}
			process.stdout.write(JSON.stringify(out, null, "\t") + "\n");
		' "$studio_file" "$tmpl_file" "$NAME")"
		if [[ "$merged" == "$(cat "$tmpl_file")" ]]; then
			unchanged=$((unchanged + 1))
			continue
		fi
		echo "  ~ $rel (merged, name/version preserved)"
		if [[ $APPLY -eq 1 ]]; then
			printf '%s' "$merged" > "$tmpl_file"
		fi
		copied=$((copied + 1))
		continue
	fi

	if cmp -s "$studio_file" "$tmpl_file"; then
		unchanged=$((unchanged + 1))
		continue
	fi

	echo "  ~ $rel"
	if [[ $APPLY -eq 1 ]]; then
		cp "$studio_file" "$tmpl_file"
	fi
	copied=$((copied + 1))
done < <(
	cd "$TEMPLATE" && git ls-files -z 2>/dev/null \
		| while IFS= read -r -d '' f; do printf '%s\0' "$TEMPLATE/$f"; done
)

echo
echo "summary:"
echo "  changed:      $copied"
echo "  unchanged:    $unchanged"
echo "  skipped:      $skipped  (schemaTypes, app.css, deploy artefacts)"
echo "  template-only: $template_only  (no match in studio)"

if [[ $APPLY -eq 0 && $copied -gt 0 ]]; then
	echo
	echo "dry run — re-run with --apply to write changes."
fi

if [[ $APPLY -eq 1 && $copied -gt 0 ]]; then
	echo
	echo "reminder: add an entry to templates/$NAME/CHANGELOG.md under"
	echo "'## Unreleased' describing what changed so downstream users"
	echo "know what to port into their customized projects."
fi
