#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   CONFIRM_PURGE=YES REPLACE_TEXT_FILE=/tmp/replacements.txt ./scripts/purge-secret-history.sh
#
# WARNING:
# - Rewrites git history (all branches + tags)
# - Requires force push after execution
# - Run only when the team is aligned

if [[ "${CONFIRM_PURGE:-}" != "YES" ]]; then
  echo "Set CONFIRM_PURGE=YES to continue."
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required. Install with: pip install git-filter-repo"
  exit 1
fi

is_bare_repo="$(git rev-parse --is-bare-repository 2>/dev/null || echo false)"
if [[ "${is_bare_repo}" != "true" ]] && [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit/stash changes or run this on a fresh clone."
  exit 1
fi

replace_text_file="${REPLACE_TEXT_FILE:-}"
if [[ -z "${replace_text_file}" ]]; then
  echo "Set REPLACE_TEXT_FILE=/path/to/replacements.txt."
  exit 1
fi

echo "Rewriting git history..."
git filter-repo --replace-text "${replace_text_file}" --force

cat <<'EOF'
History rewrite complete.

Next steps:
1) git push --force --all
2) git push --force --tags
3) ask all contributors to re-clone or hard-reset.
EOF
