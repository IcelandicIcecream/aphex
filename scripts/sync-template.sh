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
# Templates exclude src/lib/schemaTypes/: studio's schema dir is a dev fixture
# playground (movie, league, catalog, ...), so each template keeps its own
# curated schemas.
#
# Usage:
#   ./scripts/sync-template.sh                  # preview base (dry run)
#   ./scripts/sync-template.sh --apply          # write base
#   ./scripts/sync-template.sh website          # preview website
#   ./scripts/sync-template.sh website --apply  # write website

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="$REPO_ROOT/apps/studio"

# Args are order-insensitive: a bare word names the template, --apply writes.
NAME="base"
APPLY=0
for arg in "$@"; do
	case "$arg" in
		--apply) APPLY=1 ;;
		base|website) NAME="$arg" ;;
		*)
			echo "usage: $0 [base|website] [--apply]" >&2
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
		# The public front page is the template's own work. Studio's is a two-line
		# "Welcome to SvelteKit" stub, because studio is an admin dev harness with
		# no public site, so syncing it silently deletes the template's homepage.
		src/routes/+page.svelte) return 0 ;;
		# Deploy artefacts: tailored to the standalone scaffolded layout
		# (single-package, no monorepo paths), so don't let a future studio
		# Dockerfile/Procfile silently clobber them.
		Dockerfile) return 0 ;;
		Procfile) return 0 ;;
		# SECURITY: the template's .gitignore has to stand on its own — it is split
		# out into a public standalone repo, where the monorepo's root .gitignore
		# does not follow it. Studio's is the thin monorepo-child version with no
		# `.env` rule, so syncing it would publish real credentials from every
		# scaffolded project. Never copy this one.
		.gitignore) return 0 ;;
		# Studio's EMAIL_FROM is this project's own verified sender on a real
		# domain. A template must ship a placeholder, not somebody's live address.
		src/lib/email-sender.ts) return 0 ;;
	esac

	# Base keeps its own minimal content model (a single `page` type), so anything
	# that names studio's document types is template-owned — the same reason
	# schemaTypes/ is skipped.
	if [[ "$NAME" == "base" ]]; then
		case "$rel" in
			# The persistence seam: base is SQLite-by-default (zero-infra, with its
			# schema pushed on boot) and
			# ships two drivers, while studio is Postgres-by-default and carries a
			# third (pglite) so it can exercise every adapter. Syncing these three
			# silently reverts the starter to "install Postgres first".
			src/lib/server/db/index.ts) return 0 ;;
			src/lib/server/db/adapters/types.ts) return 0 ;;
			drizzle.config.ts) return 0 ;;
			.env.example) return 0 ;;
			# Each starter owns its environment-driven AI provider configuration and
			# persistence defaults. Port shared config additions here deliberately.
			aphex.config.ts) return 0 ;;
			# Studio's registry configures seoPlugin over blog_post/author/tag.
			src/lib/plugins.ts) return 0 ;;
			# Studio's seed writes blog documents; base seeds its own example page.
			src/lib/server/seed/*) return 0 ;;
			# Wires the embed block's editor preview, which is studio's own content
			# model. (The admin +layout.server.ts is NOT skipped: it resolves the
			# siteSettings singleton, and base has one — including the favicon field
			# it reads. Keeping those in step is cheaper than a permanent fork.)
			"src/routes/(protected)/admin/+page.svelte") return 0 ;;
			# Studio links to its `/blog` fixture; base links to its public homepage.
			"src/routes/(protected)/admin/+layout.svelte") return 0 ;;
			# Base owns its public site. Studio's `(site)` routes render its blog
			# fixture and import modules base doesn't ship ($lib/server/site,
			# $lib/site/templates, $lib/blog/*, components/render/*) — and the sync
			# only overwrites existing files, never adds the missing ones, so
			# copying them breaks base's build.
			'src/routes/(site)/'*) return 0 ;;
		esac
	fi

	# The website template is a page builder: its whole front end (block renderers,
	# hero variants, link resolution, the archive) is its own, and it derives from
	# base rather than from studio. Studio has no public site at all — its `(site)`
	# routes are a two-file fixture — so syncing them deletes the template's site.
	if [[ "$NAME" == "website" ]]; then
		case "$rel" in
			# The persistence seam. Same reasoning as base's: website inherits base's
			# SQLite-by-default setup (zero-infra), studio is Postgres-by-default with
			# a third driver for adapter coverage.
			src/lib/server/db/index.ts) return 0 ;;
			src/lib/server/db/adapters/types.ts) return 0 ;;
			drizzle.config.ts) return 0 ;;
			.env.example) return 0 ;;
			# Website owns its environment-driven AI provider configuration.
			aphex.config.ts) return 0 ;;
			# Studio's registry configures seoPlugin over blog_post/author/tag;
			# website's covers page/post/category and owns the URL resolver.
			src/lib/plugins.ts) return 0 ;;
			# Website seeds a whole demo publication, images and all.
			src/lib/server/seed/*) return 0 ;;
			# The entire public site and everything it renders with. None of this
			# exists in studio, but the front-page rule above only covers one file.
			# Quote only the literal part: a fully quoted pattern makes the `*`
			# literal too, and the rule silently matches nothing.
			'src/routes/(site)/'*) return 0 ;;
			src/routes/sitemap.xml/*) return 0 ;;
			src/routes/api/seed/*) return 0 ;;
			src/lib/components/*) return 0 ;;
			src/lib/blocks/*) return 0 ;;
			src/lib/heros/*) return 0 ;;
			src/lib/utils/*) return 0 ;;
			src/lib/server/site.ts) return 0 ;;
			src/lib/server/posts.ts) return 0 ;;
			src/lib/server/page.ts) return 0 ;;
			src/lib/server/archive.ts) return 0 ;;
			src/lib/server/archive-page.ts) return 0 ;;
			# Studio's admin layout/page link to its own `/blog` fixture and wire the
			# embed block's editor preview — both studio-only content models.
			"src/routes/(protected)/admin/+page.svelte") return 0 ;;
			"src/routes/(protected)/admin/+layout.svelte") return 0 ;;
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
					// Studio-only third driver; base ships sqlite + postgres.
					"@electric-sql/pglite",
					"@shikijs/core",
					"@shikijs/engine-javascript",
					"@shikijs/langs",
					"@shikijs/themes"
				]) {
					delete out.dependencies?.[dep];
					delete out.devDependencies?.[dep];
				}
				// Studio is where the suites and one-off scripts live; the template
				// ships neither tests/ nor most of scripts/. Inheriting the entries
				// verbatim gives a freshly scaffolded project a `pnpm test` that dies
				// on "no test files" and half a dozen scripts pointing at nothing —
				// the first thing someone tries, broken out of the box.
				for (const script of Object.keys(out.scripts ?? {})) {
					if (script === "test" || script.startsWith("test:")) delete out.scripts[script];
				}
				for (const script of ["sign-url", "private-asset-check"]) {
					delete out.scripts?.[script];
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
