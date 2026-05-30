#!/bin/bash
# POS System — Start all services
# Run: bash scripts/start-dev.sh
# Stop: Ctrl+C (kills frontends), then: bash scripts/stop-dev.sh

# Bypass proxy for localhost only (proxy stays active for everything else)
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

# Resolve project root from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

# ── Paths (update here if you rename folders) ──
DASHBOARD_DIR="$PROJECT_ROOT/apps/frontend/admin-dashboard-ui-v3"
TERMINAL_DIR="$PROJECT_ROOT/apps/frontend/pos-terminal-ui-v3"

# ── Kill stale processes from previous runs ──
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# ── Cleanup on Ctrl+C ──
PIDS=()
cleanup() {
  echo ""
  echo "Stopping frontend processes..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
  echo "Frontends stopped. Backend (Docker) still running."
  echo "  To stop backend: docker compose down"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting POS development environment..."
echo "Project root: $PROJECT_ROOT"
echo ""

# ── [1/3] Backend (Docker) ──
echo "[1/3] Starting Postgres + Redis + backend (Docker)..."
docker compose up -d
echo "  ✓ Backend stack on http://localhost:3000"

echo "  Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s --noproxy '*' http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ✗ Backend not responding after 30s. Check: docker compose logs backend"
    exit 1
  fi
  sleep 1
done

# ── [2/3] Dashboard ──
echo "[2/3] Starting dashboard..."
if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "  ✗ Dashboard directory not found: $DASHBOARD_DIR"
  exit 1
fi
cd "$DASHBOARD_DIR" || exit 1

if [ ! -d "node_modules" ]; then
  echo "  Installing dashboard dependencies (first run)..."
  npm install --no-audit --no-fund
fi
chmod +x node_modules/.bin/* 2>/dev/null

npm run dev &
PIDS+=($!)
sleep 3

if curl -s --noproxy '*' http://127.0.0.1:3001 > /dev/null 2>&1; then
  echo "  ✓ Dashboard on http://localhost:3001"
else
  echo "  ⚠ Dashboard started (PID ${PIDS[-1]}) but port 3001 not responding yet — may still be compiling"
fi

# ── [3/3] Terminal App ──
echo "[3/3] Starting terminal app..."
if [ ! -d "$TERMINAL_DIR" ]; then
  echo "  ✗ Terminal directory not found: $TERMINAL_DIR"
  echo "    If folder has a space, rename it first:"
  echo "    mv \"apps/frontend/pos-terminal-ui v3\" apps/frontend/pos-terminal-ui-v3"
  exit 1
fi
cd "$TERMINAL_DIR" || exit 1

if [ ! -d "node_modules" ]; then
  echo "  Installing terminal dependencies (first run)..."
  npm install --no-audit --no-fund
fi
chmod +x node_modules/.bin/* 2>/dev/null

npm run dev &
PIDS+=($!)
sleep 3

if curl -s --noproxy '*' http://127.0.0.1:3002 > /dev/null 2>&1; then
  echo "  ✓ Terminal on http://localhost:3002"
else
  echo "  ⚠ Terminal started (PID ${PIDS[-1]}) but port 3002 not responding yet — may still be compiling"
fi

# ── Ready ──
echo ""
echo "========================================="
echo "  All services running!"
echo ""
echo "  Business Dashboard:  http://localhost:3001/"
echo "    → owner.atlas@pos.ma / owner123      (restaurant)
    → owner.boutique@pos.ma / owner123   (retail)"
echo ""
echo "  Super Admin:         http://localhost:3001/super/login"
echo "    → admin@pos.ma / admin123"
echo ""
echo "  Terminal App:        http://localhost:3002"
echo "    → Terminal: T-001, PIN: 1234 or 5678"
echo ""
echo "  View backend logs:   docker compose logs -f backend"
echo "  Stop all:            Ctrl+C here, then: bash scripts/stop-dev.sh"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop frontends..."

# Keep script alive so background processes don't die
wait