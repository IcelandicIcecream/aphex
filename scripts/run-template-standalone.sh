#!/usr/bin/env bash
#
# run-template-standalone.sh — run a template against BUILT packages, not workspace src.
#
# Why this exists
# ---------------
# `pnpm -F @aphexcms/base dev` runs the template against `workspace:*` links, and
# those resolve to each package's *source*: cms-core's exports point at
# ./src/lib/index.js while it sits in the repo, and only `prepack` swaps them to
# ./dist. So a workspace run exercises code no user will ever receive, which is
# how you ship a template that passes CI and breaks on a fresh install.
#
# This script reproduces what a user actually gets:
#   1. build every publishable package
#   2. `pnpm pack` each one — this fires prepack, so the tarball has dist paths
#   3. copy the template somewhere pnpm won't treat as a workspace member
#   4. repoint every @aphexcms/* dep at its local tarball, overrides included so
#      transitive deps resolve to tarballs too rather than to npm
#   5. install cold and run
#
# Step 4's overrides matter: `pnpm pack` rewrites a package's own `workspace:*`
# deps to real version ranges, so without them pnpm would fetch the *published*
# cms-core from npm and quietly ignore everything you just built.
#
# Usage:
#   ./scripts/run-template-standalone.sh base            # build, install, dev
#   ./scripts/run-template-standalone.sh blog --port 5200
#   ./scripts/run-template-standalone.sh base --build    # production build only
#   ./scripts/run-template-standalone.sh base --no-pack  # reuse existing tarballs
set -euo pipefail

NAME="base"
MODE="dev"
PORT=""
REPACK=1

for arg in "$@"; do
	case "$arg" in
		base|blog) NAME="$arg" ;;
		--dev) MODE="dev" ;;
		--build) MODE="build" ;;
		--install-only) MODE="install" ;;
		--no-pack) REPACK=0 ;;
		--port) MODE="$MODE" ;;
		--port=*) PORT="${arg#*=}" ;;
		[0-9]*) PORT="$arg" ;;
		*) echo "usage: $0 [base|blog] [--dev|--build|--install-only] [--no-pack] [--port=N]" >&2; exit 1 ;;
	esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$REPO_ROOT/templates/$NAME"
OUT="${APHEX_STANDALONE_DIR:-$REPO_ROOT/.aphex-standalone}"
TARBALLS="$OUT/tarballs"
APP="$OUT/$NAME"

[ -d "$TEMPLATE" ] || { echo "no such template: $TEMPLATE" >&2; exit 1; }

echo "▸ standalone run of templates/$NAME → $APP"

# ---------------------------------------------------------------------------
# 1 + 2. Build and pack every publishable workspace package.
# ---------------------------------------------------------------------------
if [ "$REPACK" = "1" ]; then
	echo "▸ building packages"
	pnpm -r --filter "./packages/*" --filter "./plugins/*" build

	rm -rf "$TARBALLS"; mkdir -p "$TARBALLS"
	echo "▸ packing (prepack swaps src → dist)"
	while IFS= read -r pkgdir; do
		# `pnpm pack` runs prepack/postpack, so the tarball carries dist paths and
		# the working tree is restored to src afterwards.
		(cd "$pkgdir" && pnpm pack --pack-destination "$TARBALLS" >/dev/null)
		# postpack always restores to `src`, but packages differ in what they commit:
		# cms-core rests at src, ui and auth rest at dist. Packing therefore rewrites
		# the latter and leaves the tree dirty in a way that looks like a real edit.
		# Restore whatever was committed — nothing here should be editing package.json.
		git -C "$REPO_ROOT" checkout -- "$pkgdir/package.json" 2>/dev/null || true
		printf '  · %s\n' "$(basename "$pkgdir")"
	done < <(node -e '
		const fs = require("fs");
		for (const root of ["packages", "plugins"])
			for (const d of fs.readdirSync(root)) {
				const f = `${root}/${d}/package.json`;
				if (!fs.existsSync(f)) continue;
				if (!JSON.parse(fs.readFileSync(f)).private) console.log(`${root}/${d}`);
			}
	')
else
	echo "▸ reusing tarballs in $TARBALLS"
	[ -d "$TARBALLS" ] || { echo "  none found — drop --no-pack" >&2; exit 1; }
fi

# ---------------------------------------------------------------------------
# 3. Copy the template out of the workspace.
# ---------------------------------------------------------------------------
echo "▸ copying template"
rm -rf "$APP"; mkdir -p "$APP"
tar -c -C "$TEMPLATE" \
	--exclude node_modules --exclude .svelte-kit --exclude build \
	--exclude .aphex --exclude dist . | tar -x -C "$APP"

# The template's own .env is the point of a zero-config run; fall back to the
# example so a missing .env doesn't turn into a confusing runtime failure.
[ -f "$TEMPLATE/.env" ] && cp "$TEMPLATE/.env" "$APP/.env"
[ -f "$APP/.env" ] || { [ -f "$APP/.env.example" ] && cp "$APP/.env.example" "$APP/.env"; }

# ---------------------------------------------------------------------------
# 4. Repoint every @aphexcms dep at its tarball, direct and transitive.
# ---------------------------------------------------------------------------
echo "▸ rewriting deps to tarballs"
node - "$APP" "$TARBALLS" <<'NODE'
const fs = require('fs');
const path = require('path');
const [, , appDir, tarballDir] = process.argv;

// name → tarball, read from each archive's own package.json rather than parsed
// out of the filename: @aphexcms/plugin-seo packs as aphexcms-plugin-seo-0.1.0.tgz
// and that mapping is not reliably invertible.
const { execFileSync } = require('child_process');
const byName = {};
for (const file of fs.readdirSync(tarballDir).filter((f) => f.endsWith('.tgz'))) {
	const full = path.join(tarballDir, file);
	const raw = execFileSync('tar', ['-xOzf', full, 'package/package.json'], { encoding: 'utf8' });
	byName[JSON.parse(raw).name] = `file:${full}`;
}

const pkgPath = path.join(appDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let rewritten = 0;
for (const field of ['dependencies', 'devDependencies']) {
	for (const dep of Object.keys(pkg[field] ?? {})) {
		if (byName[dep]) {
			pkg[field][dep] = byName[dep];
			rewritten++;
		}
	}
}

// Overrides catch the transitive case: pnpm pack turns a package's own
// `workspace:*` deps into version ranges, so cms-core's dependency on
// @aphexcms/ui would otherwise be satisfied from npm with the published build.
pkg.pnpm = { ...(pkg.pnpm ?? {}), overrides: { ...(pkg.pnpm?.overrides ?? {}), ...byName } };
pkg.private = true;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`  · ${rewritten} direct, ${Object.keys(byName).length} overrides`);
NODE

# ---------------------------------------------------------------------------
# 5. Cold install and run.
# ---------------------------------------------------------------------------
echo "▸ installing (cold, no workspace)"
(cd "$APP" && pnpm install --ignore-workspace --config.confirmModulesPurge=false)

case "$MODE" in
	install) echo "▸ ready — cd $APP && pnpm dev" ;;
	build)   (cd "$APP" && pnpm build) && echo "▸ build OK" ;;
	dev)
		echo "▸ starting dev${PORT:+ on :$PORT}"
		if [ -n "$PORT" ]; then (cd "$APP" && pnpm dev --port "$PORT")
		else (cd "$APP" && pnpm dev); fi
		;;
esac
