#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.synthetic.yml"
APPROVAL_DIR="$ROOT_DIR/approvals"
PROJECT_PREFIX="vulnlab-session"

usage() {
  cat <<'EOF'
Uso:
  ./sandbox/docker-session.sh review <session>
  ./sandbox/docker-session.sh approve <session>
  ./sandbox/docker-session.sh run <session>
  ./sandbox/docker-session.sh stop <session>

El flujo es Docker-only. `approve` debe ejecutarse después de revisar el compose.
`run` arranca el proyecto aprobado y ejecuta cleanup automático al salir.
EOF
}

require_docker() {
  command -v docker >/dev/null 2>&1 || { echo "Docker es obligatorio y no está instalado." >&2; exit 127; }
  docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 es obligatorio." >&2; exit 127; }
}

validate_session() {
  [[ "${1:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]{2,48}$ ]] || { echo "Identificador de sesión inválido." >&2; exit 2; }
}

project_name() { echo "${PROJECT_PREFIX}-$1"; }
compose_hash() { sha256sum "$COMPOSE_FILE" | awk '{print $1}'; }
approval_file() { echo "$APPROVAL_DIR/$1.approved"; }

review() {
  local session="$1"
  validate_session "$session"
  echo "Sesión: $session"
  echo "Proyecto Docker: $(project_name "$session")"
  echo "Compose SHA-256: $(compose_hash)"
  echo "--- docker compose config ---"
  docker compose -f "$COMPOSE_FILE" config
  echo "--- controles requeridos ---"
  echo "red internal=true; sin ports; read_only; cap_drop=ALL; no-new-privileges; límites CPU/memoria/PIDs"
}

approve() {
  local session="$1"
  validate_session "$session"
  mkdir -p "$APPROVAL_DIR"
  cat > "$(approval_file "$session")" <<EOF
session=$session
compose_sha256=$(compose_hash)
approved_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  echo "Aprobación guardada para $session. Revise nuevamente si cambia el compose."
}

require_approval() {
  local session="$1" file expected actual
  file="$(approval_file "$session")"
  [[ -f "$file" ]] || { echo "Sesión no aprobada. Ejecute review y luego approve." >&2; exit 3; }
  expected="$(compose_hash)"
  actual="$(sed -n 's/^compose_sha256=//p' "$file")"
  [[ "$actual" == "$expected" ]] || { echo "La aprobación no coincide con el compose actual." >&2; exit 3; }
}

cleanup() {
  local session="$1"
  docker compose -p "$(project_name "$session")" -f "$COMPOSE_FILE" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -f "$(approval_file "$session")"
  echo "Sesión Docker destruida: $session"
}

run_session() {
  local session="$1"
  validate_session "$session"
  require_approval "$session"
  trap 'cleanup "$session"' EXIT INT TERM
  docker compose -p "$(project_name "$session")" -f "$COMPOSE_FILE" up --build
}

stop_session() {
  local session="$1"
  validate_session "$session"
  docker compose -p "$(project_name "$session")" -f "$COMPOSE_FILE" down --volumes --remove-orphans
  rm -f "$(approval_file "$session")"
}

command="${1:-}"
session="${2:-}"
case "$command" in
  review) require_docker; review "$session" ;;
  approve) require_docker; approve "$session" ;;
  run) require_docker; run_session "$session" ;;
  stop) require_docker; stop_session "$session" ;;
  *) usage; exit 2 ;;
esac
