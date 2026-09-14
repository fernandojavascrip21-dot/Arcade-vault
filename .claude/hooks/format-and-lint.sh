#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): runs Prettier (and ESLint for code files) on the
# file that was just written/edited.
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

input="$(cat)"
file="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

PRETTIER="./node_modules/.bin/prettier"
ESLINT="./node_modules/.bin/eslint"

case "$file" in
  *.tsx|*.jsx|*.ts|*.js|*.mjs|*.cjs)
    "$PRETTIER" --write "$file" >/dev/null 2>&1 || true
    "$ESLINT" --fix "$file" >/dev/null 2>&1 || true

    remaining="$("$ESLINT" "$file" 2>&1 || true)"
    if [ -n "$remaining" ]; then
      echo "ESLint encontró problemas que no se pudieron corregir automáticamente en $file:" >&2
      echo "$remaining" >&2
      exit 2
    fi
    ;;
  *.md|*.mdx)
    "$PRETTIER" --write "$file" >/dev/null 2>&1 || true
    ;;
  *)
    exit 0
    ;;
esac

exit 0
