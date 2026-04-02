#!/usr/bin/env bash
# Happy Vibecode — Bootstrap Script (macOS / Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/your-org/happy-vibecode/main/scripts/setup.sh | bash
set -euo pipefail

REPO_URL="https://github.com/your-org/happy-vibecode.git"
INSTALL_DIR="${HAPPY_INSTALL_DIR:-$HOME/.happy-vibecode}"
SKIP_CLONE="${SKIP_CLONE:-false}"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '\033[34m→\033[0m %s\n' "$*"; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m⚠\033[0m %s\n' "$*"; }
die()   { printf '\033[31m✗\033[0m %s\n' "$*"; exit 1; }

bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "  Happy Vibecode — Setup"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Check Bun ────────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  # shellcheck disable=SC1090
  source "$HOME/.bun/env" || export PATH="$HOME/.bun/bin:$PATH"
fi
ok "Bun $(bun --version)"

# ── Clone or update repo ──────────────────────────────────────────────────────
if [[ "$SKIP_CLONE" != "true" ]]; then
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Updating repository..."
    git -C "$INSTALL_DIR" pull --ff-only
  else
    info "Cloning repository to $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

cd "$INSTALL_DIR"

# ── Install dependencies ──────────────────────────────────────────────────────
info "Installing dependencies..."
bun install --frozen-lockfile

ok "Dependencies installed"

# ── Safety: check for existing .env ──────────────────────────────────────────
ENV_FILE="apps/web/.env"
if [[ -f "$ENV_FILE" ]]; then
  warn "apps/web/.env already exists — setup wizard will NOT overwrite it."
  echo "   Delete it first if you want to reconfigure from scratch."
fi

# ── Run setup wizard ──────────────────────────────────────────────────────────
info "Launching interactive setup wizard..."
bun run packages/cli/src/index.ts setup

ok "Happy Vibecode is ready! 🚀"
echo ""
bold "Next steps:"
echo "  bun run dev:web       — start local dev server"
echo "  bun run -F @happy-vibecode/web deploy  — deploy to Cloudflare"
echo ""
