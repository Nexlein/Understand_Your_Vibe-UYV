#!/usr/bin/env bash
# =============================================================================
# start-dev.sh — Lance toute la stack en dev
# =============================================================================
# Usage :
#   ./start-dev.sh           Lance web + ai
#   ./start-dev.sh --tunnel  Lance web + ai + ngrok (tech lead)
#   ./start-dev.sh --seed    Lance web + ai + insère des données de test
#
# Ctrl+C arrête proprement tous les processus.
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
WEB_PORT="${WEB_PORT:-3000}"
AI_PORT="${AI_PORT:-8000}"
NGROK_DOMAIN="${NGROK_DOMAIN:-handball-fiddle-chooser.ngrok-free.dev}"

# ── Couleurs ──────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; CYAN=$'\033[36m'; RESET=$'\033[0m'; BOLD=$'\033[1m'; DIM=$'\033[2m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""; RESET=""; BOLD=""; DIM=""
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
log()   { printf '%s[start-dev]%s %s\n'      "$CYAN"   "$RESET" "$*"; }
ok()    { printf '%s[start-dev] ✓%s %s\n'   "$GREEN"  "$RESET" "$*"; }
warn()  { printf '%s[start-dev] ⚠%s  %s\n' "$YELLOW" "$RESET" "$*"; }
error() { printf '%s[start-dev] ✗%s %s\n'   "$RED"    "$RESET" "$*" >&2; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Commande manquante : '$1' — installe-la d'abord."
    exit 1
  fi
}

check_port() {
  local port=$1 name=$2
  if lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    error "Port $port déjà occupé — impossible de démarrer $name."
    error "  → kill \$(lsof -t -i:$port)"
    exit 1
  fi
}

# Attend qu'une URL HTTP réponde (code 2xx ou 3xx).
# Affiche un spinner animé pendant l'attente.
wait_for_http() {
  local name=$1 url=$2 max=${3:-90}
  local i=0
  local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

  while ! curl -sf --max-time 2 "$url" >/dev/null 2>&1; do
    if [ $i -ge $max ]; then
      echo ""
      error "$name non disponible après ${max}s."
      error "  Vérifie les logs ci-dessus pour trouver l'erreur."
      return 1
    fi
    printf '\r%s  %s Attente de %-12s (%ds)%s' \
      "$DIM" "${spin[$((i % 10))]}" "$name" "$i" "$RESET"
    sleep 1
    i=$((i + 1))
  done
  printf '\r%s  ✓ %-12s prêt (%ds)%s\n' "$GREEN" "$name" "$i" "$RESET"
}

# ── Parse args ────────────────────────────────────────────────────────────────
WITH_TUNNEL=0
WITH_SEED=0
for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) WITH_TUNNEL=1 ;;
    --seed|-s)   WITH_SEED=1 ;;
    --help|-h)
      sed -n 's/^# \?//p' "$0" | head -12
      exit 0
      ;;
    *) error "Argument inconnu : $arg"; exit 1 ;;
  esac
done

# ── Prérequis ─────────────────────────────────────────────────────────────────
log "Vérification des prérequis..."
require pnpm
require node
require curl
[ "$WITH_TUNNEL" -eq 1 ] && require ngrok

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d "web" ] || [ ! -d "ai" ]; then
  error "Dossiers 'web/' et 'ai/' introuvables — lance depuis la racine du repo."
  exit 1
fi

# ── Variables d'environnement ─────────────────────────────────────────────────
if [ -f "web/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source web/.env.local
  set +a
  ok ".env.local chargé"
else
  warn "web/.env.local absent — certaines fonctionnalités ne fonctionneront pas."
fi

[ -z "${OPENAI_API_KEY:-}" ] && warn "OPENAI_API_KEY absent — le service AI sera en mode dégradé (503)."

# ── Vérification des ports ────────────────────────────────────────────────────
check_port "$WEB_PORT" "Next.js"
check_port "$AI_PORT"  "FastAPI"

# ── Venv Python ───────────────────────────────────────────────────────────────
AI_READY=0
if [ -f "ai/main.py" ]; then
  AI_READY=1

  # Auto-détection de la version Python (préfère 3.12, accepte 3.11–3.14)
  PYTHON_BIN=""
  for py in python3.12 python3.11 python3.13 python3.14 python3; do
    if command -v "$py" >/dev/null 2>&1; then
      PYTHON_BIN="$py"
      break
    fi
  done
  if [ -z "$PYTHON_BIN" ]; then
    error "Aucune installation Python 3 trouvée."
    exit 1
  fi

  if [ ! -d "ai/.venv" ]; then
    warn "Création du venv Python avec $PYTHON_BIN..."
    (cd ai && "$PYTHON_BIN" -m venv .venv && source .venv/bin/activate && pip install -e . -q)
    ok "venv créé"
  fi
else
  warn "ai/main.py absent — service AI ignoré."
fi

# ── Dépendances Node ──────────────────────────────────────────────────────────
if [ ! -d "web/node_modules" ]; then
  warn "Installation des dépendances Node..."
  (cd web && pnpm install --silent)
  ok "node_modules installé"
fi

# ── Base de données ───────────────────────────────────────────────────────────
if [ ! -f "web/prisma/dev.db" ]; then
  warn "Migration initiale de la DB Prisma..."
  (cd web && pnpm dlx prisma migrate dev --name init 2>&1 | grep -E 'error|warn|✔' || true)
  ok "DB initialisée"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  trap '' INT TERM EXIT
  echo ""
  log "Arrêt des processus..."
  # Kill tous les jobs background du script courant
  # shellcheck disable=SC2046
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  ok "Stack arrêtée."
}
trap cleanup INT TERM EXIT

# ── Lancement ─────────────────────────────────────────────────────────────────
printf '\n%s%s  ⚖  Code Tribunal — Dev Stack%s\n\n' "$BOLD" "$CYAN" "$RESET"

# Service Python (FastAPI)
if [ "$AI_READY" -eq 1 ]; then
  (
    cd ai
    # shellcheck disable=SC1091
    source .venv/bin/activate
    uvicorn main:app --reload --port "$AI_PORT" --reload-include "*.md" --log-level warning
  ) 2>&1 | sed "s/^/${BLUE}[ai]${RESET}     /" &
fi

# Next.js
(
  cd web
  pnpm dev --port "$WEB_PORT"
) 2>&1 | sed "s/^/${GREEN}[web]${RESET}    /" &

# ngrok (optionnel)
if [ "$WITH_TUNNEL" -eq 1 ]; then
  ngrok http --url="$NGROK_DOMAIN" "$WEB_PORT" --log=stdout 2>&1 \
    | sed "s/^/${YELLOW}[ngrok]${RESET}  /" &
fi

# ── Health checks ─────────────────────────────────────────────────────────────
echo ""
log "En attente que les services démarrent..."
echo ""

# FastAPI : /docs répond toujours 200 (pas besoin de la clé OpenAI)
[ "$AI_READY" -eq 1 ] && wait_for_http "FastAPI" "http://localhost:$AI_PORT/docs" 60

# Next.js : attend que la page principale réponde
wait_for_http "Next.js" "http://localhost:$WEB_PORT" 120

# ── Bannière READY ────────────────────────────────────────────────────────────
line="──────────────────────────────────────────────────"
printf '\n%s┌%s┐%s\n' "$GREEN" "$line" "$RESET"
printf '%s│%s  ✓  Stack prête — tous les services répondent    %s│%s\n' "$GREEN" "$RESET" "$GREEN" "$RESET"
printf '%s├%s┤%s\n' "$GREEN" "$line" "$RESET"
printf '%s│%s  🌐 Web       http://localhost:%-4s               %s│%s\n' "$GREEN" "$RESET" "$WEB_PORT"   "$GREEN" "$RESET"
printf '%s│%s  🤖 AI docs   http://localhost:%-4s/docs          %s│%s\n' "$GREEN" "$RESET" "$AI_PORT"    "$GREEN" "$RESET"
printf '%s│%s  🔬 AI health http://localhost:%-4s/healthz       %s│%s\n' "$GREEN" "$RESET" "$AI_PORT"    "$GREEN" "$RESET"
if [ "$WITH_TUNNEL" -eq 1 ]; then
  printf '%s│%s  🔗 Tunnel    https://%-27s  %s│%s\n' "$GREEN" "$RESET" "$NGROK_DOMAIN" "$GREEN" "$RESET"
fi
printf '%s└%s┘%s\n' "$GREEN" "$line" "$RESET"
echo ""

if [ "$WITH_SEED" -eq 0 ]; then
  printf '%s  Tip:%s Pour tester sans GitHub : ./start-dev.sh --seed\n\n' "$DIM" "$RESET"
fi

# ── Seed optionnel ────────────────────────────────────────────────────────────
if [ "$WITH_SEED" -eq 1 ]; then
  log "Insertion des données de test..."
  (cd web && node scripts/seed-test.mjs) || warn "Seed échoué — stack toujours active, retry : node web/scripts/seed-test.mjs"
  echo ""
fi

ok "Ctrl+C pour tout arrêter."
echo ""

wait
