#!/usr/bin/env bash
# Publish KNOWLEDGE / MCP assets via clawhub when you only have a file or URL.
# clawhub itself always requires a folder; this wrapper builds a temp skill folder.
#
# Usage:
#   scripts/clawhub-publish-asset.sh knowledge --file ./doc.txt --name "后台测试" --summary "说明"
#   scripts/clawhub-publish-asset.sh knowledge ./doc.txt --name "后台测试" --summary "说明"
#   scripts/clawhub-publish-asset.sh spec ./api-spec.md --name "API规范" --summary "说明"
#   scripts/clawhub-publish-asset.sh knowledge --url "https://..." --name "后台测试" --summary "说明"
#   scripts/clawhub-publish-asset.sh mcp --url "http://127.0.0.1:8080/sse" --name "My MCP" --summary "说明"
#   scripts/clawhub-publish-asset.sh app --url "http://127.0.0.1:8080" --name "客服智能体" --summary "说明"
#
# Optional:
#   --registry http://49.235.61.16:3000/
#   --kb-type DOC|FAQ|...
#   --related-product "某产品"
#   --slug my-kb
#
# Note: upstream `npx clawhub publish` always requires a folder. This wrapper builds one.

set -euo pipefail

TYPE="${1:-}"
shift || true

FILE=""
URL=""
NAME=""
SUMMARY=""
REGISTRY="${CLAWHUB_REGISTRY:-}"
KB_TYPE="DOC"
RELATED_PRODUCT=""
SLUG=""
MCP_MODE="REMOTE"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

[[ -n "$TYPE" ]] || usage
TYPE="$(printf '%s' "$TYPE" | tr '[:lower:]' '[:upper:]')"
case "$TYPE" in
  KNOWLEDGE|MCP|APP|SPEC) ;;
  AGENT) TYPE="APP" ;;
  *) echo "error: type must be knowledge, mcp, app, or spec" >&2; usage ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --url) URL="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --summary) SUMMARY="$2"; shift 2 ;;
    --registry) REGISTRY="$2"; shift 2 ;;
    --kb-type) KB_TYPE="$2"; shift 2 ;;
    --related-product) RELATED_PRODUCT="$2"; shift 2 ;;
    --slug) SLUG="$2"; shift 2 ;;
    --mcp-mode) MCP_MODE="$2"; shift 2 ;;
    -h|--help) usage ;;
    -*)
      echo "error: unknown arg: $1" >&2
      usage
      ;;
    *)
      # Positional path: treat as --file for convenience.
      if [[ -z "$FILE" ]]; then
        FILE="$1"
        shift
      else
        echo "error: unexpected arg: $1" >&2
        usage
      fi
      ;;
  esac
done

[[ -n "$NAME" ]] || { echo "error: --name required" >&2; exit 1; }
[[ -n "$SUMMARY" ]] || SUMMARY="$NAME"

if [[ "$TYPE" == "KNOWLEDGE" ]]; then
  if [[ -z "$FILE" && -z "$URL" ]]; then
    echo "error: knowledge requires --file/--url or a positional file path" >&2
    exit 1
  fi
elif [[ "$TYPE" == "SPEC" ]]; then
  if [[ -z "$FILE" ]]; then
    echo "error: spec requires --file or a positional file path" >&2
    exit 1
  fi
elif [[ "$TYPE" == "APP" ]]; then
  if [[ -z "$FILE" && -z "$URL" ]]; then
    echo "error: app requires --url or --file" >&2
    exit 1
  fi
elif [[ -z "$URL" ]]; then
  echo "error: mcp requires --url" >&2
  exit 1
fi

if [[ -n "$FILE" && ! -f "$FILE" ]]; then
  echo "error: file not found: $FILE" >&2
  exit 1
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/skillhub-asset.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

yaml_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1], ensure_ascii=False))' "$1"
}

{
  echo '---'
  echo "name: $(yaml_escape "$NAME")"
  echo "description: $(yaml_escape "$SUMMARY")"
  echo "packageType: $TYPE"
  if [[ -n "$URL" ]]; then
    echo "accessUrl: $(yaml_escape "$URL")"
  fi
  if [[ "$TYPE" == "KNOWLEDGE" ]]; then
    echo "kbType: $(yaml_escape "$KB_TYPE")"
    if [[ -n "$RELATED_PRODUCT" ]]; then
      echo "relatedProduct: $(yaml_escape "$RELATED_PRODUCT")"
    fi
  fi
  if [[ "$TYPE" == "MCP" ]]; then
    echo "mcpMode: $(yaml_escape "$MCP_MODE")"
  fi
  echo '---'
  echo
  echo "# $NAME"
  echo
  echo "$SUMMARY"
  if [[ -n "$URL" ]]; then
    echo
    echo "- url: $URL"
  fi
} > "$TMP/SKILL.md"

if [[ -n "$FILE" ]]; then
  cp "$FILE" "$TMP/$(basename "$FILE")"
fi

ARGS=(publish "$TMP" --categories "$TYPE" --name "$NAME")
[[ -n "$SLUG" ]] && ARGS+=(--slug "$SLUG")
[[ -n "$REGISTRY" ]] && ARGS=(--registry "$REGISTRY" "${ARGS[@]}")

echo "==> Publishing $TYPE from temp folder: $TMP"
npx --yes clawhub "${ARGS[@]}"
