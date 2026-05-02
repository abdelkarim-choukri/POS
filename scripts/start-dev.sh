#!/bin/bash
# POS System — Start all services via Docker
# Run: bash scripts/start-dev.sh

# Bypass proxy for localhost only (proxy stays active for everything else)
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

# Resolve project root from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

echo "Starting POS development environment..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Start backend stack (Postgres + Redis + backend) in Docker
echo "[1/3] Starting Postgres + Redis + backend (Docker)..."
docker compose up -d
echo "  ✓ Backend stack on http://127.0.0.1:3000"

# Wait for backend to be healthy before starting frontends
echo "  Waiting for backend to be ready..."
until curl -s --noproxy localhost http://127.0.0.1:3000/api/health > /dev/null 2>&1; do
  sleep 1
done
echo "  ✓ Backend healthy"

# Start dashboard (native, for Vite hot-reload)
echo "[2/3] Starting dashboard..."
cd "$PROJECT_ROOT/apps/dashboard-web" || { echo "  ✗ Dashboard directory not found!"; exit 1; }
npm run dev &>/dev/null &
sleep 2
echo "  ✓ Dashboard on http://127.0.0.1:5173"

# Start terminal app (native)
echo "[3/3] Starting terminal app..."
cd "$PROJECT_ROOT/apps/terminal-app" || { echo "  ✗ Terminal directory not found!"; exit 1; }
npm run dev &>/dev/null &
sleep 2
echo "  ✓ Terminal on http://127.0.0.1:5174"

echo ""
echo "========================================="
echo "  All services running!"
echo ""
echo "  Business Dashboard:  http://127.0.0.1:5173/login"
echo "    → owner@demo.com / owner123"
echo ""
echo "  Super Admin:         http://127.0.0.1:5173/super/login"
echo "    → admin@pos.com / admin123"
echo ""
echo "  Terminal App:        http://127.0.0.1:5174"
echo "    → Terminal: T-001, PIN: 1234 or 5678"
echo ""
echo "  View backend logs:   docker compose logs -f backend"
echo "  Stop all:            bash scripts/stop-dev.sh"
echo "========================================="