#!/usr/bin/env bash
#
# branch-check.sh — pre-merge checklist for a big branch change.
#
# Answers the two questions you always forget before merging:
#   1. Which publishable packages changed and therefore need a changeset?
#   2. Is the studio → template sync out of date?
#
# Usage:
#   ./scripts/branch-check.sh            # compare against main
#   ./scripts/branch-check.sh <ref>      # compare against another base ref
#   ./scripts/branch-check.sh --check    # also run `pnpm check` (typecheck, slow)
#
# Read-only: never writes, never publishes. Just tells you what's pending.

set -uo pipefail
cd "$(dirname "$0")/.."

BASE="main"
RUN_CHECK=0
for arg in "$@"; do
  case "$arg" in
    --check) RUN_CHECK=1 ;;
    *) BASE="$arg" ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
red() { printf '\033[31m%s\033[0m\n' "$1"; }

MERGE_BASE="$(git merge-base "$BASE" HEAD 2>/dev/null || echo "$BASE")"
bold "▶ Branch check: $(git branch --show-current) vs $BASE"
echo

# Changed files = committed since merge-base + uncommitted working tree.
CHANGED="$( { git diff --name-only "$MERGE_BASE"...HEAD; git status --porcelain | sed 's/^...//'; } | sort -u )"

# Changeset ignore list (packages excluded from publishing).
IGNORED="$(node -p "(require('./.changeset/config.json').ignore||[]).join(' ')" 2>/dev/null || echo '')"
# All changeset bodies concatenated (to grep for package names).
CHANGESET_TEXT="$(cat .changeset/*.md 2>/dev/null | grep -v '^#' || true)"

# ---- 1. Publishable packages that changed → need a changeset -------------------
bold "① Publishable packages changed on this branch"
NEEDS_CHANGESET=0
for dir in packages/* plugins/*; do
  [ -f "$dir/package.json" ] || continue
  echo "$CHANGED" | grep -q "^$dir/" || continue          # unchanged
  name="$(node -p "require('./$dir/package.json').name" 2>/dev/null)"
  priv="$(node -p "require('./$dir/package.json').private||false" 2>/dev/null)"
  ver="$(node -p "require('./$dir/package.json').version" 2>/dev/null)"
  [ "$priv" = "true" ] && continue                         # private, not published
  case " $IGNORED " in *" $name "*) continue ;; esac       # changeset-ignored
  if echo "$CHANGESET_TEXT" | grep -q "$name"; then
    green "  ✓ $name@$ver — changeset present"
  else
    yellow "  ⚠ $name@$ver — CHANGED but no changeset"
    NEEDS_CHANGESET=1
  fi
done
if [ "$NEEDS_CHANGESET" = "1" ]; then
  echo
  red "  → Run: pnpm changeset   (add one entry per ⚠ package above)"
fi
echo

# ---- 2. Template sync status ---------------------------------------------------
bold "② studio → template sync (dry run)"
if [ -x ./scripts/sync-template.sh ]; then
  SYNC_OUT="$(./scripts/sync-template.sh 2>&1 || true)"
  echo "$SYNC_OUT" | grep -E 'changed:|unchanged:|skipped:|template-only:' || echo "  (see ./scripts/sync-template.sh)"
  CHANGED_N="$(echo "$SYNC_OUT" | sed -n 's/.*changed:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)"
  if [ "${CHANGED_N:-0}" != "0" ] && [ -n "${CHANGED_N:-}" ]; then
    echo
    yellow "  ⚠ $CHANGED_N template file(s) out of date."
    echo "    → Review, then: ./scripts/sync-template.sh --apply"
    echo "    → Note: templates/base is the MINIMAL starter — don't sync studio-only"
    echo "      example content (blog/seed/render) into it; that belongs in templates/blog."
    echo "    → Update templates/base/CHANGELOG.md (Unreleased) with what changed."
  else
    green "  ✓ template in sync"
  fi
else
  yellow "  (no scripts/sync-template.sh)"
fi
echo

# ---- 3. Optional typecheck -----------------------------------------------------
if [ "$RUN_CHECK" = "1" ]; then
  bold "③ pnpm check (typecheck)"
  pnpm check 2>&1 | tail -8
  echo
fi

# ---- Checklist -----------------------------------------------------------------
bold "Pre-merge checklist"
cat <<'EOF'
  [ ] Changesets added for every ⚠ package (pnpm changeset)
  [ ] Template sync reviewed/applied + CHANGELOG updated (if ② flagged changes)
  [ ] Rebuilt dist-consumed packages if their source changed
      (ui, visual-editing, adapters, plugins — NOT cms-core, which is source-consumed)
  [ ] pnpm check green            (re-run this script with --check)
  [ ] pnpm lint / pnpm format
EOF
