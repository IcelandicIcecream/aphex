#!/usr/bin/env bash
#
# bump-template-version.sh — Bump templates/base version and roll the changelog
#
# Updates templates/base/package.json version, rewrites the CHANGELOG heads-up
# line, renames the `## Unreleased` heading to the new version (inserting a
# fresh empty Unreleased above), and writes a Changesets entry for
# `create-aphex` so the next CI run republishes the scaffolder with the new
# template baked in. The template itself (`@aphexcms/base`) is in the
# changesets `ignore` list, so it's versioned manually here.
#
# Usage:
#   ./scripts/bump-template-version.sh 0.0.3            # dry run
#   ./scripts/bump-template-version.sh 0.0.3 --apply    # write changes
#
# After applying, commit and push. `sync-template.yml` mirrors templates/base/
# to the standalone repo immediately; `release.yml` opens a version-packages
# PR for create-aphex via Changesets, which on merge republishes the scaffolder.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/templates/base"
PKG="$TEMPLATE/package.json"
CHANGELOG="$TEMPLATE/CHANGELOG.md"
CHANGESET_DIR="$REPO_ROOT/.changeset"
BUMP_LEVEL="patch"  # change to minor/major if the template bump warrants it

if [[ $# -lt 1 ]]; then
	echo "usage: $0 <new-version> [--apply]" >&2
	exit 2
fi

NEW_VERSION="$1"
APPLY=0
if [[ "${2:-}" == "--apply" ]]; then
	APPLY=1
fi

if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ ]]; then
	echo "error: '$NEW_VERSION' doesn't look like semver (e.g. 0.0.3)" >&2
	exit 1
fi

if [[ ! -f "$PKG" || ! -f "$CHANGELOG" ]]; then
	echo "error: expected $PKG and $CHANGELOG to exist" >&2
	exit 1
fi

CURRENT_VERSION=$(node -p "require('$PKG').version")

if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
	echo "error: new version equals current version ($CURRENT_VERSION)" >&2
	exit 1
fi

# Bail if the Unreleased section is empty — nothing to release.
UNRELEASED_BODY=$(awk '
	/^## Unreleased[[:space:]]*$/ { in_section=1; next }
	in_section && /^## / { exit }
	in_section { print }
' "$CHANGELOG" | grep -v '^[[:space:]]*$' || true)

if [[ -z "$UNRELEASED_BODY" ]]; then
	echo "error: Unreleased section in $CHANGELOG is empty — nothing to release" >&2
	exit 1
fi

TMP_PKG=$(mktemp)
TMP_CHANGELOG=$(mktemp)
TMP_CHANGESET=$(mktemp)
CHANGESET_FILE="$CHANGESET_DIR/bump-template-${NEW_VERSION//./-}.md"
trap 'rm -f "$TMP_PKG" "$TMP_CHANGELOG" "$TMP_CHANGESET"' EXIT

# Changeset for create-aphex so the scaffolder republishes with the new template.
cat > "$TMP_CHANGESET" <<EOF
---
"create-aphex": $BUMP_LEVEL
---

Bump bundled template (\`@aphexcms/base\`) to v$NEW_VERSION.
EOF

if [[ -f "$CHANGESET_FILE" ]]; then
	echo "error: $CHANGESET_FILE already exists — refusing to overwrite" >&2
	exit 1
fi

# package.json — preserve tab indentation that the rest of the repo uses.
node -e "
	const fs = require('fs');
	const [pkgPath, version, outPath] = process.argv.slice(1);
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	pkg.version = version;
	fs.writeFileSync(outPath, JSON.stringify(pkg, null, '\t') + '\n');
" "$PKG" "$NEW_VERSION" "$TMP_PKG"

# CHANGELOG — two edits in one pass:
#   1. Bump the heads-up line (`v0.0.2` → `v0.0.3`) — \Q..\E makes the match literal.
#   2. Rename `## Unreleased` to `## <new>`, leaving a fresh empty Unreleased above.
CURRENT_VERSION="$CURRENT_VERSION" NEW_VERSION="$NEW_VERSION" perl -pe '
	s/\Qv$ENV{CURRENT_VERSION}\E/v$ENV{NEW_VERSION}/g;
	s/^## Unreleased\s*$/## Unreleased\n\n## $ENV{NEW_VERSION}/;
' "$CHANGELOG" > "$TMP_CHANGELOG"

echo "Bumping templates/base: $CURRENT_VERSION → $NEW_VERSION"

if [[ $APPLY -eq 0 ]]; then
	echo
	echo "=== package.json ==="
	diff -u "$PKG" "$TMP_PKG" || true
	echo
	echo "=== CHANGELOG.md ==="
	diff -u "$CHANGELOG" "$TMP_CHANGELOG" || true
	echo
	echo "=== new file: $CHANGESET_FILE ==="
	cat "$TMP_CHANGESET"
	echo
	echo "Dry run — re-run with --apply to write changes."
	exit 0
fi

mv "$TMP_PKG" "$PKG"
mv "$TMP_CHANGELOG" "$CHANGELOG"
mv "$TMP_CHANGESET" "$CHANGESET_FILE"
trap - EXIT

echo
echo "Wrote:"
echo "  $PKG"
echo "  $CHANGELOG"
echo "  $CHANGESET_FILE"
echo
echo "Next: commit + push to main."
echo "  - sync-template.yml mirrors templates/base/ to the standalone repo."
echo "  - release.yml opens a Changesets PR to bump + republish create-aphex."
