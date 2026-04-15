#!/usr/bin/env bash
#
# sync-template.sh — Sync apps/studio → templates/base
#
# Template-driven: walks every tracked file in templates/base and copies the
# matching file from apps/studio if it exists. Files that only live in the
# template (Dockerfile, README.md, prod.docker-compose.yml, etc.) are left
# alone. Files that only live in studio (tests, seed routes, etc.) are never
# copied — so studio-only drift can't leak into the template.
#
# Excludes src/lib/schemaTypes/ so the template keeps its minimal example
# schema (post.ts) instead of inheriting studio's dev fixtures.
#
# Usage:
#   ./scripts/sync-template.sh            # preview changes (dry run)
#   ./scripts/sync-template.sh --apply    # actually write files

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="$REPO_ROOT/apps/studio"
TEMPLATE="$REPO_ROOT/templates/base"

APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
	APPLY=1
fi

if [[ ! -d "$STUDIO" || ! -d "$TEMPLATE" ]]; then
	echo "error: expected $STUDIO and $TEMPLATE to exist" >&2
	exit 1
fi

# Paths under templates/base to never touch.
should_skip() {
	local rel="$1"
	case "$rel" in
		src/lib/schemaTypes/*) return 0 ;;
		*) return 1 ;;
	esac
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
	# template's own `name` and `version`.
	if [[ "$rel" == "package.json" ]]; then
		merged="$(node -e '
			const fs = require("fs");
			const studio = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
			const tmpl = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
			const out = { ...studio, name: tmpl.name, version: tmpl.version };
			process.stdout.write(JSON.stringify(out, null, "\t") + "\n");
		' "$studio_file" "$tmpl_file")"
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
echo "  skipped:      $skipped  (schemaTypes)"
echo "  template-only: $template_only  (no match in studio)"

if [[ $APPLY -eq 0 && $copied -gt 0 ]]; then
	echo
	echo "dry run — re-run with --apply to write changes."
fi
