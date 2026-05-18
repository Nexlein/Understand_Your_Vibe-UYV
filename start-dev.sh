#!/usr/bin/env bash
# =============================================================================
# start-dev.sh — Lance toute la stack en dev
# =============================================================================
# Usage :
#   ./start-dev.sh           Lance web + ai (par défaut, pour les devs)
#   ./start-dev.sh --tunnel  Lance web + ai + ngrok (tech lead uniquement)
#
# Ctrl+C arrête proprement tous les processus.
# =============================================================================

set -euo pipefail

# ---------------------------- Configuration ----------------------------------

WEB_PORT="${WEB_PORT:-3000}"
AI_PORT="${AI_PORT:-8000}"
NGROK_DOMAIN="${NGROK_DOMAIN:-handball-fiddle-chooser.ngrok-free.dev}"

# Couleurs (avec fallback si terminal non-couleur)
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; CYAN=$'\033[36m'; RESET=$'\033[0m'; BOLD=$'\033[1m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""; RESET=""; BOLD=""
fi

# ---------------------------- Helpers ----------------------------------------

log()   { echo "${CYAN}[start-dev]${RESET} $*"; }
ok()    { echo "${GREEN}[start-dev] ✓${RESET} $*"; }
warn()  { echo "${YELLOW}[start-dev] ⚠${RESET} $*"; }
error() { echo "${RED}[start-dev] ✗${RESET} $*" >&2; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Commande manquante : $1"
    error "Installe-la puis relance le script."
    exit 1
  fi
}

# ---------------------------- Parse args -------------------------------------

WITH_TUNNEL=0
for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) WITH_TUNNEL=1 ;;
    --help|-h)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) error "Argument inconnu : $arg"; exit 1 ;;
  esac
done

# ---------------------------- Prérequis --------------------------------------

log "Vérification des prérequis..."
require pnpm
require python3
require node
if [ "$WITH_TUNNEL" -eq 1 ]; then
  require ngrok
fi

# Détecter la racine du projet (le script doit être à la racine)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d "web" ] || [ ! -d "ai" ]; then
  error "Ce script doit être lancé à la racine du repo (dossiers 'web/' et 'ai/' attendus)."
  exit 1
fi

# Charger web/.env.local si présent
if [ -f "web/.env.local" ]; then
  log "Chargement de web/.env.local..."
  set -a
  # shellcheck disable=SC1091
  source web/.env.local
  set +a
fi

# Vérifier le venv Python (seulement si le service AI est prêt)
AI_READY=0
if [ -f "ai/main.py" ]; then
  AI_READY=1
  if [ ! -d "ai/.venv" ]; then
    warn "Le venv Python n'existe pas (ai/.venv). Création..."
    (cd ai && python3 -m venv .venv && source .venv/bin/activate && pip install -e .)
    ok "venv créé et dépendances installées"
  fi
else
  warn "ai/main.py absent — service AI ignoré (Phase 1 only)"
fi

# Vérifier node_modules
if [ ! -d "web/node_modules" ]; then
  warn "node_modules absent dans web/. Installation..."
  (cd web && pnpm install)
  ok "Dépendances web installées"
fi

# Vérifier que la DB Prisma est initialisée
if [ ! -f "web/prisma/dev.db" ]; then
  warn "Base de données absente. Migration initiale..."
  (cd web && pnpm dlx prisma migrate dev --name init || true)
fi

# ---------------------------- Cleanup on exit --------------------------------

PIDS=()

cleanup() {
  echo ""
  log "Arrêt des processus..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  ok "Tout est arrêté. À plus."
  exit 0
}

trap cleanup INT TERM EXIT

# ---------------------------- Lancement --------------------------------------

log ""
log "${BOLD}Démarrage de la stack [NOM_DU_PROJET]${RESET}"
log "  Web      → http://localhost:$WEB_PORT"
log "  AI       → http://localhost:$AI_PORT"
if [ "$WITH_TUNNEL" -eq 1 ]; then
  log "  Tunnel   → https://$NGROK_DOMAIN"
fi
log ""

# 1) Service Python (FastAPI) — seulement si prêt
if [ "$AI_READY" -eq 1 ]; then
  log "Lancement du service AI (FastAPI) sur le port $AI_PORT..."
  (
    cd ai
    # shellcheck disable=SC1091
    source .venv/bin/activate
    exec uvicorn main:app \
      --reload \
      --port "$AI_PORT" \
      --reload-include "*.md" \
      --log-level info 2>&1 | sed "s/^/${BLUE}[ai]${RESET}    /"
  ) &
  PIDS+=($!)
fi

# 2) Next.js (web)
log "Lancement de Next.js sur le port $WEB_PORT..."
(
  cd web
  exec pnpm dev --port "$WEB_PORT" 2>&1 | sed "s/^/${GREEN}[web]${RESET}   /"
) &
PIDS+=($!)

# 3) ngrok (tunnel) — optionnel
if [ "$WITH_TUNNEL" -eq 1 ]; then
  log "Lancement de ngrok sur le domaine $NGROK_DOMAIN..."
  (
    exec ngrok http --url="$NGROK_DOMAIN" "$WEB_PORT" --log=stdout 2>&1 \
      | sed "s/^/${YELLOW}[ngrok]${RESET} /"
  ) &
  PIDS+=($!)
fi

log ""
ok "Tous les services tournent. Ctrl+C pour arrêter."
log ""

# Attendre que tous les processus finissent (ou Ctrl+C)
wait
