#!/usr/bin/env bash
# Offline deploy SkillHub to a remote host (default: 49.235.61.16).
#
# Local machine builds artifacts; remote only loads images and starts compose.
# No Maven/npm/network pulls are required on the remote host during deploy.
#
# Usage:
#   ./scripts/deploy-remote-offline.sh                 # full offline deploy
#   ./scripts/deploy-remote-offline.sh --web-only      # frontend only (no Docker)
#   ./scripts/deploy-remote-offline.sh --skip-base     # reuse base images already on remote
#   ./scripts/deploy-remote-offline.sh --package-only  # build bundle under .deploy-offline/
#   ./scripts/deploy-remote-offline.sh --from-bundle .deploy-offline/skillhub-offline-*.tgz
#
# Prerequisites (local):
#   - SSH key login to remote
#   - pnpm (for web build)
#   - Docker with buildx, able to build --platform linux/amd64 (except --web-only)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

REMOTE_HOST="${REMOTE_HOST:-49.235.61.16}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/data/skillhub}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-skillhub}"
COMPOSE_FILE="docker-compose.remote-dev.yml"
ENV_FILE=".env.remote-dev"
SERVER_IMAGE="skillhub-server:remote-dev"
PLATFORM="linux/amd64"
BUNDLE_DIR="${ROOT_DIR}/.deploy-offline"
KEEP_BUNDLE=0

MODE="full" # full | web-only | package-only | from-bundle
FROM_BUNDLE=""
SKIP_BASE=0
SKIP_WEB_BUILD=0
SKIP_SERVER_BUILD=0
DRY_RUN=0

BASE_IMAGES=(
  "postgres:16-alpine"
  "redis:7-alpine"
  "nginx:alpine"
)

usage() {
  cat <<'EOF'
Usage: scripts/deploy-remote-offline.sh [options]

Options:
  --host <host>           Remote SSH host (default: 49.235.61.16)
  --user <user>           Remote SSH user (default: root)
  --remote-dir <path>     Remote deploy directory (default: /data/skillhub)
  --web-only              Only build/sync frontend static files and reload nginx
  --skip-base             Do not transfer postgres/redis/nginx images
  --skip-web-build        Reuse existing web/dist
  --skip-server-build     Reuse local skillhub-server:remote-dev image
  --package-only          Build offline bundle locally; do not SSH/deploy
  --from-bundle <tgz>     Deploy from an existing offline bundle tarball
  --keep-bundle           Keep .deploy-offline working files after deploy
  --dry-run               Print actions without executing remote changes
  -h, --help              Show this help

Environment overrides:
  REMOTE_HOST REMOTE_USER REMOTE_DIR COMPOSE_PROJECT
EOF
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) REMOTE_HOST="$2"; shift 2 ;;
    --user) REMOTE_USER="$2"; shift 2 ;;
    --remote-dir) REMOTE_DIR="$2"; shift 2 ;;
    --web-only) MODE="web-only"; shift ;;
    --skip-base) SKIP_BASE=1; shift ;;
    --skip-web-build) SKIP_WEB_BUILD=1; shift ;;
    --skip-server-build) SKIP_SERVER_BUILD=1; shift ;;
    --package-only) MODE="package-only"; shift ;;
    --from-bundle) MODE="from-bundle"; FROM_BUNDLE="$2"; shift 2 ;;
    --keep-bundle) KEEP_BUNDLE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unsupported argument: $1" ;;
  esac
done

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_OPTS=(
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=3
  -o ConnectTimeout=15
)

ssh_run() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[dry-run] ssh ${SSH_TARGET} $*"
    return 0
  fi
  ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "$@"
}

rsync_to_remote() {
  local src="$1"
  local dest="$2"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[dry-run] rsync ${src} -> ${SSH_TARGET}:${dest}"
    return 0
  fi
  rsync -az --progress -e "ssh ${SSH_OPTS[*]}" "${src}" "${SSH_TARGET}:${dest}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_local_env() {
  [[ -f "${ENV_FILE}" ]] || die "Missing ${ENV_FILE}. Copy .env.remote-dev.example and edit it."
  [[ -f "${COMPOSE_FILE}" ]] || die "Missing ${COMPOSE_FILE}"
  [[ -f "web/nginx.conf.template" ]] || die "Missing web/nginx.conf.template"
}

require_docker() {
  require_cmd docker
  docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker Desktop (or dockerd) and retry."
  docker buildx version >/dev/null 2>&1 || die "docker buildx is required for --platform ${PLATFORM} builds"
}

build_web() {
  if [[ "${SKIP_WEB_BUILD}" -eq 1 ]]; then
    [[ -f "web/dist/index.html" ]] || die "web/dist missing; omit --skip-web-build"
    log "Reusing existing web/dist"
    return 0
  fi
  require_cmd pnpm
  log "Building frontend"
  (cd web && pnpm install --frozen-lockfile && pnpm run build)
  [[ -f "web/dist/index.html" ]] || die "Frontend build failed: web/dist/index.html not found"
}

build_server_image() {
  if [[ "${SKIP_SERVER_BUILD}" -eq 1 ]]; then
    docker image inspect "${SERVER_IMAGE}" >/dev/null 2>&1 \
      || die "Local image ${SERVER_IMAGE} not found; omit --skip-server-build"
    log "Reusing local image ${SERVER_IMAGE}"
    return 0
  fi
  log "Building server image ${SERVER_IMAGE} (${PLATFORM})"
  docker buildx build \
    --platform "${PLATFORM}" \
    --tag "${SERVER_IMAGE}" \
    --file server/Dockerfile \
    --load \
    server
}

ensure_base_images() {
  local image
  for image in "${BASE_IMAGES[@]}"; do
    if docker image inspect "${image}" >/dev/null 2>&1; then
      log "Base image present: ${image}"
      continue
    fi
    log "Pulling base image: ${image}"
    docker pull --platform "${PLATFORM}" "${image}"
  done
}

stamp="$(date +%Y%m%d%H%M%S)"
work_dir="${BUNDLE_DIR}/work-${stamp}"
images_tar="${work_dir}/images/skillhub-images.tar"
bundle_tgz="${BUNDLE_DIR}/skillhub-offline-${stamp}.tgz"

prepare_work_dir() {
  mkdir -p "${work_dir}/images" "${work_dir}/web" "${BUNDLE_DIR}"
}

save_images() {
  local -a images=("${SERVER_IMAGE}")
  if [[ "${SKIP_BASE}" -eq 0 ]]; then
    images+=("${BASE_IMAGES[@]}")
  fi
  log "Saving images -> ${images_tar}"
  docker save "${images[@]}" -o "${images_tar}"
}

stage_bundle_files() {
  prepare_work_dir
  mkdir -p "${work_dir}/web/dist"
  cp -a web/dist/. "${work_dir}/web/dist/"
  cp -a web/nginx.conf.template "${work_dir}/web/nginx.conf.template"
  cp -a "${COMPOSE_FILE}" "${work_dir}/"
  cp -a "${ENV_FILE}" "${work_dir}/"
  cp -a .env.remote-dev.example "${work_dir}/" 2>/dev/null || true
  cat > "${work_dir}/README-OFFLINE.txt" <<EOF
SkillHub offline bundle
created_at=${stamp}
server_image=${SERVER_IMAGE}
platform=${PLATFORM}
skip_base=${SKIP_BASE}

On target host:
  tar -xzf skillhub-offline-*.tgz -C /data/skillhub --strip-components=1
  # or use scripts/deploy-remote-offline.sh --from-bundle <this.tgz>
EOF
}

pack_bundle() {
  log "Packing bundle ${bundle_tgz}"
  tar -C "${work_dir}" -czf "${bundle_tgz}" .
  log "Bundle ready: ${bundle_tgz}"
  ls -lh "${bundle_tgz}"
}

deploy_web_only() {
  require_local_env
  build_web
  log "Syncing frontend to ${SSH_TARGET}:${REMOTE_DIR}"
  ssh_run "mkdir -p '${REMOTE_DIR}/web'"
  rsync_to_remote "web/dist/" "${REMOTE_DIR}/web/dist/"
  rsync_to_remote "web/nginx.conf.template" "${REMOTE_DIR}/web/nginx.conf.template"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    return 0
  fi
  ssh_run "cd '${REMOTE_DIR}' && docker compose -p '${COMPOSE_PROJECT}' -f '${COMPOSE_FILE}' --env-file '${ENV_FILE}' up -d web && docker compose -p '${COMPOSE_PROJECT}' -f '${COMPOSE_FILE}' --env-file '${ENV_FILE}' exec -T web nginx -s reload || docker compose -p '${COMPOSE_PROJECT}' -f '${COMPOSE_FILE}' --env-file '${ENV_FILE}' restart web"
}

remote_load_and_up() {
  local remote_images_tar="$1"
  log "Loading images and starting stack on ${SSH_TARGET}"
  ssh_run bash -s -- "${REMOTE_DIR}" "${COMPOSE_PROJECT}" "${COMPOSE_FILE}" "${ENV_FILE}" "${remote_images_tar}" <<'REMOTE'
set -euo pipefail
remote_dir="$1"
project="$2"
compose_file="$3"
env_file="$4"
images_tar="$5"

cd "${remote_dir}"
test -f "${compose_file}"
test -f "${env_file}"
test -f "web/dist/index.html"
test -f "web/nginx.conf.template"

if [[ -n "${images_tar}" && -f "${images_tar}" ]]; then
  echo "==> docker load < ${images_tar}"
  docker load -i "${images_tar}"
fi

# Never build on the remote host (2G RAM / offline).
docker compose -p "${project}" -f "${compose_file}" --env-file "${env_file}" up -d --no-build
docker compose -p "${project}" -f "${compose_file}" --env-file "${env_file}" ps

web_port="$(awk -F= '/^WEB_PORT=/{print $2}' "${env_file}" | tail -n 1)"
web_port="${web_port:-3000}"
api_port="$(awk -F= '/^API_PORT=/{print $2}' "${env_file}" | tail -n 1)"
api_port="${api_port:-18080}"

echo "==> waiting for health"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${api_port}/actuator/health" >/dev/null 2>&1 \
    && curl -fsS "http://127.0.0.1:${web_port}/nginx-health" >/dev/null 2>&1; then
    echo "OK web=:${web_port} api=:${api_port}"
    exit 0
  fi
  sleep 2
done

echo "Health check timed out" >&2
docker compose -p "${project}" -f "${compose_file}" --env-file "${env_file}" ps >&2 || true
docker compose -p "${project}" -f "${compose_file}" --env-file "${env_file}" logs --tail=80 server >&2 || true
exit 1
REMOTE
}

sync_bundle_and_deploy() {
  local local_bundle_root="$1"
  local has_images="${2:-1}"

  require_cmd ssh
  require_cmd rsync
  ssh_run "mkdir -p '${REMOTE_DIR}/web/dist' '${REMOTE_DIR}/.offline-inbox'"

  rsync_to_remote "${local_bundle_root}/${COMPOSE_FILE}" "${REMOTE_DIR}/"
  rsync_to_remote "${local_bundle_root}/${ENV_FILE}" "${REMOTE_DIR}/"
  rsync_to_remote "${local_bundle_root}/web/nginx.conf.template" "${REMOTE_DIR}/web/nginx.conf.template"
  rsync_to_remote "${local_bundle_root}/web/dist/" "${REMOTE_DIR}/web/dist/"

  local remote_images=""
  if [[ "${has_images}" -eq 1 && -f "${local_bundle_root}/images/skillhub-images.tar" ]]; then
    log "Uploading image archive (may take a while)"
    rsync_to_remote "${local_bundle_root}/images/skillhub-images.tar" "${REMOTE_DIR}/.offline-inbox/skillhub-images.tar"
    remote_images="${REMOTE_DIR}/.offline-inbox/skillhub-images.tar"
  fi

  remote_load_and_up "${remote_images}"

  if [[ "${DRY_RUN}" -eq 0 && -n "${remote_images}" ]]; then
    ssh_run "rm -f '${remote_images}'"
  fi
}

verify_public() {
  local web_port
  web_port="$(awk -F= '/^WEB_PORT=/{print $2}' "${ENV_FILE}" | tail -n 1)"
  web_port="${web_port:-3000}"
  local url="http://${REMOTE_HOST}:${web_port}/"
  log "Verifying ${url}"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    return 0
  fi
  curl -fsSI "${url}" | head -n 5 || warn "Public URL check failed; verify firewall/security group for :${web_port}"
  cat <<EOF

Deployed.
  Web:  ${url}
  API:  http://${REMOTE_HOST}:$(awk -F= '/^API_PORT=/{print $2}' "${ENV_FILE}" | tail -n 1 | sed 's/^$/18080/')
  Admin (bootstrap): admin / (see ${ENV_FILE} BOOTSTRAP_ADMIN_PASSWORD)
EOF
}

cleanup_work() {
  if [[ "${KEEP_BUNDLE}" -eq 1 ]]; then
    log "Keeping bundle workdir: ${work_dir}"
    return 0
  fi
  if [[ -d "${work_dir}" ]]; then
    rm -rf "${work_dir}"
  fi
}

case "${MODE}" in
  web-only)
    require_cmd ssh
    require_cmd rsync
    require_local_env
    ssh_run "true" || die "SSH to ${SSH_TARGET} failed (need BatchMode key auth)"
    deploy_web_only
    verify_public
    ;;
  package-only)
    require_local_env
    require_docker
    build_web
    build_server_image
    if [[ "${SKIP_BASE}" -eq 0 ]]; then
      ensure_base_images
    fi
    stage_bundle_files
    save_images
    pack_bundle
    KEEP_BUNDLE=1
    log "Package-only done. Deploy later with:"
    echo "  ./scripts/deploy-remote-offline.sh --from-bundle ${bundle_tgz}"
    ;;
  from-bundle)
    require_cmd ssh
    require_cmd rsync
    require_cmd tar
    [[ -n "${FROM_BUNDLE}" && -f "${FROM_BUNDLE}" ]] || die "--from-bundle requires an existing .tgz"
    ssh_run "true" || die "SSH to ${SSH_TARGET} failed (need BatchMode key auth)"
    prepare_work_dir
    log "Extracting ${FROM_BUNDLE}"
    tar -xzf "${FROM_BUNDLE}" -C "${work_dir}"
    [[ -f "${work_dir}/${ENV_FILE}" ]] || die "Bundle missing ${ENV_FILE}"
    sync_bundle_and_deploy "${work_dir}" 1
    verify_public
    cleanup_work
    ;;
  full)
    require_cmd ssh
    require_cmd rsync
    require_local_env
    require_docker
    ssh_run "true" || die "SSH to ${SSH_TARGET} failed (need BatchMode key auth)"
    build_web
    build_server_image
    if [[ "${SKIP_BASE}" -eq 0 ]]; then
      ensure_base_images
    fi
    stage_bundle_files
    save_images
    pack_bundle
    sync_bundle_and_deploy "${work_dir}" 1
    verify_public
    if [[ "${KEEP_BUNDLE}" -eq 1 ]]; then
      log "Bundle kept at ${bundle_tgz}"
    else
      cleanup_work
      # keep the .tgz by default for re-deploy; remove only work dir
      log "Offline bundle kept at ${bundle_tgz} (re-deploy with --from-bundle)"
    fi
    ;;
  *)
    die "Unknown mode: ${MODE}"
    ;;
esac
